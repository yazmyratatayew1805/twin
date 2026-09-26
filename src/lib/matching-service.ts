import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Answers } from "@/config/questions";
import { checkRedFlags } from "@/lib/ai/red-flags";
import {
  compatibility,
  finalScore,
  isMutualMatch,
  type Breakdown,
  type Person,
} from "@/lib/matching";

/** Красные флаги проверяем только для топ-20 кандидатов — бережём запросы к API. */
export const RED_FLAG_TOP_N = 20;
const PAGE = 1000; // PostgREST отдаёт не больше 1000 строк за запрос
const INSERT_CHUNK = 500;

type Scored = { other: Person; base: number; breakdown: Breakdown };

type MatchRow = {
  user_a: string;
  user_b: string;
  score: number;
  breakdown: Breakdown;
  red_flags: number;
  explanation: null;
  updated_at: string;
};

async function loadParticipants(admin: SupabaseClient): Promise<Person[]> {
  const people: Person[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("answers")
      .select("user_id, answers, profiles!inner(gender, looking_for)")
      .order("user_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`loadParticipants: ${error.message}`);
    for (const row of data) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      people.push({
        id: row.user_id,
        gender: profile.gender,
        lookingFor: profile.looking_for,
        answers: row.answers as Answers,
      });
    }
    if (data.length < PAGE) return people;
  }
}

/** Сходство «идеального дня» с остальными (считает pgvector). Нет эмбеддинга — пустая карта. */
async function daySimilarities(admin: SupabaseClient, userId: string): Promise<Map<string, number>> {
  const sims = new Map<string, number>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .rpc("day_similarities", { p_user: userId })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`daySimilarities: ${error.message}`);
    for (const row of data as { user_id: string; similarity: number }[]) sims.set(row.user_id, row.similarity);
    if (data.length < PAGE) return sims;
  }
}

function scoreAgainst(me: Person, people: Person[], sims: Map<string, number>): Scored[] {
  return people
    .filter((other) => isMutualMatch(me, other))
    .map((other) => ({ other, ...compatibility(me, other, sims.get(other.id) ?? null) }))
    .sort((x, y) => y.base - x.base);
}

const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

/** Флаги для топ-кандидатов. Дневной бюджет бесплатного тарифа учитывается внутри generateJson. */
async function redFlagsFor(anchor: Person, candidates: Person[]): Promise<Map<string, number>> {
  if (!aiEnabled() || candidates.length === 0) return new Map();
  return checkRedFlags(anchor, candidates);
}

function toRow(x: string, y: string, base: number, breakdown: Breakdown, redFlags: number, now: string): MatchRow {
  const [user_a, user_b] = x < y ? [x, y] : [y, x];
  return {
    user_a,
    user_b,
    score: finalScore(base, redFlags),
    breakdown,
    red_flags: redFlags,
    explanation: null, // пересчёт сбрасывает кеш объяснения
    updated_at: now,
  };
}

async function insertRows(admin: SupabaseClient, rows: MatchRow[]) {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const { error } = await admin.from("matches").insert(rows.slice(i, i + INSERT_CHUNK));
    if (error) throw new Error(`insert matches: ${error.message}`);
  }
}

/**
 * Совместимость одного участника со всеми остальными — после сохранения анкеты.
 * Старые пары участника удаляются: предпочтения или ответы могли измениться.
 */
export async function computeMatchesFor(admin: SupabaseClient, userId: string) {
  const people = await loadParticipants(admin);
  const me = people.find((p) => p.id === userId);

  const { error: deleteError } = await admin
    .from("matches")
    .delete()
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (deleteError) throw new Error(`delete matches: ${deleteError.message}`);
  if (!me) return { pairs: 0, redFlagsChecked: 0 };

  const scored = scoreAgainst(me, people, await daySimilarities(admin, userId));
  const top = scored.slice(0, RED_FLAG_TOP_N).map((s) => s.other);
  const flags = await redFlagsFor(me, top);

  const now = new Date().toISOString();
  await insertRows(
    admin,
    scored.map((s) => toRow(me.id, s.other.id, s.base, s.breakdown, flags.get(s.other.id) ?? 0, now)),
  );
  return { pairs: scored.length, redFlagsChecked: aiEnabled() ? top.length : 0 };
}

/** «Пересчитать всё» из админки: каждая пара считается один раз, флаги — для топ-20 каждого. */
export async function recalculateAll(admin: SupabaseClient) {
  const people = await loadParticipants(admin);
  const byId = new Map(people.map((p) => [p.id, p]));
  const pairKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

  const pairs = new Map<string, { a: string; b: string; base: number; breakdown: Breakdown }>();
  const ranked = new Map<string, Scored[]>();
  for (const me of people) {
    const scored = scoreAgainst(me, people, await daySimilarities(admin, me.id));
    ranked.set(me.id, scored);
    for (const s of scored) {
      const key = pairKey(me.id, s.other.id);
      if (!pairs.has(key)) pairs.set(key, { a: me.id, b: s.other.id, base: s.base, breakdown: s.breakdown });
    }
  }

  const flags = new Map<string, number>();
  const checked = new Set<string>();
  for (const me of people) {
    const pending = (ranked.get(me.id) ?? [])
      .slice(0, RED_FLAG_TOP_N)
      .map((s) => s.other)
      .filter((o) => !checked.has(pairKey(me.id, o.id)));
    if (pending.length === 0) continue;
    const result = await redFlagsFor(byId.get(me.id)!, pending);
    for (const o of pending) {
      checked.add(pairKey(me.id, o.id));
      const count = result.get(o.id);
      if (count) flags.set(pairKey(me.id, o.id), count);
    }
  }

  const { error: deleteError } = await admin.from("matches").delete().gte("score", 0);
  if (deleteError) throw new Error(`delete matches: ${deleteError.message}`);

  const now = new Date().toISOString();
  await insertRows(
    admin,
    [...pairs.entries()].map(([key, p]) => toRow(p.a, p.b, p.base, p.breakdown, flags.get(key) ?? 0, now)),
  );
  return {
    participants: people.length,
    pairs: pairs.size,
    redFlagsChecked: aiEnabled() ? checked.size : 0,
  };
}
