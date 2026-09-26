import type { Breakdown, PairFact } from "@/lib/matching";

/** Всё, что объяснение знает о паре. Сырых ответов анкеты здесь нет — только сводка. */
export type ExplanationInput = {
  score: number;
  breakdown: Breakdown;
  strongest: PairFact[];
  difference: PairFact | null;
};

const BLOCK_LEAD: Record<keyof Breakdown, string> = {
  psychology: "Сильнее всего вас сближает психология",
  lifestyle: "Сильнее всего вас сближает образ жизни",
  tastes: "Сильнее всего вас сближают вкусы",
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Шаблонное объяснение по разбивке — когда ИИ недоступен или исчерпан бесплатный лимит. */
export function templateExplanation({ breakdown, strongest, difference }: ExplanationInput): string {
  const best = (Object.keys(breakdown) as (keyof Breakdown)[]).reduce((x, y) =>
    breakdown[y] > breakdown[x] ? y : x,
  );
  const sentences = [`${BLOCK_LEAD[best]} — ${breakdown[best]}%.`];

  const facts = strongest.slice(0, 2).map((f) => f.phrase);
  if (facts.length) sentences.push(`${capitalize(facts.join(", а ещё "))}.`);

  sentences.push(
    difference
      ? `Правда, ${difference.phrase} — придётся договориться.`
      : "Серьёзных различий алгоритм не нашёл — подозрительно, но приятно.",
  );
  return sentences.join(" ");
}
