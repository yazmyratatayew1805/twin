import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Answers } from "@/config/questions";
import { generateExplanations } from "@/lib/ai/explanations";
import { templateExplanation, type ExplanationInput } from "@/lib/explanation-template";
import { pairHighlights, type Breakdown, type PairFact } from "@/lib/matching";
import { rateLimit } from "@/lib/rate-limit";

export const TOP_N = 5;

/** То, что участник видит о совпадении: ник, возраст, процент, разбивка и объяснение. Без ответов анкеты. */
export type ResultCard = {
  otherId: string;
  nickname: string;
  age: number;
  score: number;
  breakdown: Breakdown;
  redFlags: number;
  explanation: string;
  /** false — шаблонный текст (ИИ недоступен); такой текст не кешируется. */
  aiWritten: boolean;
  strongest: PairFact[];
  difference: PairFact | null;
};

type MatchRow = {
  user_a: string;
  user_b: string;
  score: number;
  breakdown: Breakdown;
  red_flags: number;
  explanation: string | null;
  updated_at: string;
};

/**
 * Топ-5 совпадений участника. Недостающие объяснения пишет ИИ одним запросом и кеширует
 * в matches.explanation; если ИИ недоступен — подставляется шаблон по разбивке.
 */
export async function getTopMatches(admin: SupabaseClient, userId: string): Promise<ResultCard[]> {
  const { data: rows, error } = await admin
    .from("matches")
    .select("user_a, user_b, score, breakdown, red_flags, explanation, updated_at")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("score", { ascending: false })
    .limit(TOP_N);
  if (error) throw new Error(`getTopMatches: ${error.message}`);
  if (!rows?.length) return [];

  const matches = rows as MatchRow[];
  const otherIds = matches.map((m) => (m.user_a === userId ? m.user_b : m.user_a));

  const [{ data: profiles }, { data: answers }] = await Promise.all([
    admin.from("profiles").select("id, nickname, age").in("id", otherIds),
    admin.from("answers").select("user_id, answers").in("user_id", [userId, ...otherIds]),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const answersById = new Map((answers ?? []).map((a) => [a.user_id, a.answers as Answers]));
  const mine = answersById.get(userId);

  const cards = matches.flatMap((m, i) => {
    const otherId = otherIds[i];
    const profile = profileById.get(otherId);
    const theirs = answersById.get(otherId);
    if (!profile || !mine || !theirs) return [];
    const highlights = pairHighlights(mine, theirs);
    return [{ row: m, otherId, profile, highlights }];
  });

  const inputOf = (c: (typeof cards)[number]): ExplanationInput => ({
    score: c.row.score,
    breakdown: c.row.breakdown,
    ...c.highlights,
  });

  // Объяснения, которых ещё нет в кеше, — одним запросом к ИИ.
  const missing = cards.filter((c) => !c.row.explanation);
  const generated = new Map<string, string>();
  if (missing.length && (await rateLimit(`explain:${userId}`, 10, 3600, { failOpen: false }))) {
    const texts = await generateExplanations(missing.map(inputOf));
    await Promise.all(
      missing.map(async (c, i) => {
        const text = texts[i];
        if (!text) return;
        generated.set(c.otherId, text);
        // Пишем, только если пару не пересчитали, пока шёл запрос к ИИ.
        await admin
          .from("matches")
          .update({ explanation: text })
          .eq("user_a", c.row.user_a)
          .eq("user_b", c.row.user_b)
          .eq("updated_at", c.row.updated_at);
      }),
    );
  }

  return cards.map((c) => {
    const ai = c.row.explanation ?? generated.get(c.otherId) ?? null;
    return {
      otherId: c.otherId,
      nickname: c.profile.nickname,
      age: c.profile.age,
      score: c.row.score,
      breakdown: c.row.breakdown,
      redFlags: c.row.red_flags,
      explanation: ai ?? templateExplanation(inputOf(c)),
      aiWritten: ai !== null,
      strongest: c.highlights.strongest,
      difference: c.highlights.difference,
    };
  });
}
