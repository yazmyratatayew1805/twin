import "server-only";

export * from "@/lib/pair-code";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PairCheck } from "@/lib/pair-code";
import type { Answers } from "@/config/questions";
import { generateExplanations } from "@/lib/ai/explanations";
import { checkRedFlags } from "@/lib/ai/red-flags";
import { templateExplanation } from "@/lib/explanation-template";
import {
  compatibility,
  cosineSimilarity,
  finalScore,
  pairHighlights,
  type Person,
} from "@/lib/matching";

/**
 * Режим проверки пары (вариант А): кто создал или ввёл код, не участвует в общей выдаче —
 * его не видят другие, и он не видит других.
 */
export async function pairModeUserIds(admin: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await admin.from("pair_checks").select("creator_id, partner_id");
  if (error) throw new Error(`pairModeUserIds: ${error.message}`);
  const ids = new Set<string>();
  for (const row of data) {
    ids.add(row.creator_id);
    if (row.partner_id) ids.add(row.partner_id);
  }
  return ids;
}

export async function isPairMode(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { count } = await admin
    .from("pair_checks")
    .select("code", { count: "exact", head: true })
    .or(`creator_id.eq.${userId},partner_id.eq.${userId}`);
  return (count ?? 0) > 0;
}

/** Убирает участника из общей выдачи: удаляет все его пары в matches. */
export async function leaveGeneralPool(admin: SupabaseClient, userIds: string[]) {
  for (const id of userIds) {
    const { error } = await admin.from("matches").delete().or(`user_a.eq.${id},user_b.eq.${id}`);
    if (error) throw new Error(`leaveGeneralPool: ${error.message}`);
  }
}

type Loaded = { person: Person; embedding: number[] | null };

async function loadPerson(admin: SupabaseClient, userId: string): Promise<Loaded | null> {
  const [{ data: profile }, { data: answers }] = await Promise.all([
    admin.from("profiles").select("gender, looking_for").eq("id", userId).maybeSingle(),
    admin.from("answers").select("answers, day_embedding").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile || !answers) return null;
  return {
    person: {
      id: userId,
      gender: profile.gender,
      lookingFor: profile.looking_for,
      answers: answers.answers as Answers,
    },
    embedding: answers.day_embedding ? (JSON.parse(answers.day_embedding) as number[]) : null,
  };
}

/**
 * Совместимость конкретной пары. Фильтр «кого ищет» здесь не применяется:
 * двое сами решили проверить друг друга.
 */
export async function computePair(admin: SupabaseClient, creatorId: string, partnerId: string) {
  const [creator, partner] = await Promise.all([loadPerson(admin, creatorId), loadPerson(admin, partnerId)]);
  if (!creator || !partner) return null;

  const similarity =
    creator.embedding && partner.embedding ? cosineSimilarity(creator.embedding, partner.embedding) : null;
  const { base, breakdown } = compatibility(creator.person, partner.person, similarity);
  const flags = await checkRedFlags(partner.person, [creator.person]);
  const score = finalScore(base, flags.get(creator.person.id) ?? 0);

  const input = { score, breakdown, ...pairHighlights(creator.person.answers, partner.person.answers) };
  const [aiText] = await generateExplanations([input]);
  return { score, breakdown, explanation: aiText, fallback: templateExplanation(input) };
}

/** Шаблонное объяснение для уже посчитанной проверки, если ИИ тогда не ответил. */
export async function pairFallbackExplanation(admin: SupabaseClient, check: PairCheck): Promise<string> {
  const [creator, partner] = await Promise.all([
    loadPerson(admin, check.creator_id),
    check.partner_id ? loadPerson(admin, check.partner_id) : null,
  ]);
  if (!creator || !partner || check.score === null || !check.breakdown) return "";
  return templateExplanation({
    score: check.score,
    breakdown: check.breakdown,
    ...pairHighlights(creator.person.answers, partner.person.answers),
  });
}
