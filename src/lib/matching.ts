// Алгоритм совместимости TWIN. Чистые функции без БД и сети — покрыты юнит-тестами.
//
// Score = 100 · (0.45·P + 0.25·L + 0.30·T) − 15 · RedFlags, округление до целого, не ниже 0.
//
// P — психология (0..1) = 0.40·черты + 0.35·ценности + 0.25·привязанность − 0.3 за жёсткое
//     расхождение по детям («точно хочу» vs «точно нет»).
//     Черты «Большой пятёрки»: открытость, добросовестность, экстраверсия — сходство (1 − разница);
//     доброжелательность и эмоциональная стабильность — средний уровень двоих.
//     Привязанность: средняя «надёжность» двоих, +0.2 если оба надёжные, −0.4 за «тревожный + избегающий».
// L — образ жизни (0..1): доля совпадений по 6 параметрам, хронотип и алкоголь/курение весят вдвое.
// T — вкусы (0..1): 50% Жаккар по мультивыборам + 50% косинус эмбеддингов «идеального дня».
//     Если эмбеддинга нет у кого-то из двоих — T считается только по Жаккару.

import {
  QUESTIONS,
  type AnswerValue,
  type Answers,
  type BigFiveTrait,
  type ChoiceQuestion,
  type MultiQuestion,
} from "@/config/questions";
import type { Gender, LookingFor } from "@/lib/profile";

export const BLOCK_WEIGHTS = { psychology: 0.45, lifestyle: 0.25, tastes: 0.3 } as const;
export const PSYCHOLOGY_WEIGHTS = { traits: 0.4, values: 0.35, attachment: 0.25 } as const;
export const KIDS_CONFLICT_PENALTY = 0.3;
export const RED_FLAG_PENALTY = 15;

export const VALUE_IDS = ["kids", "money", "priority", "place", "relocation", "religion"] as const;
export const LIFESTYLE_WEIGHTS: Record<string, number> = {
  chronotype: 2,
  habits: 2,
  sport: 1,
  food: 1,
  parties: 1,
  pets: 1,
};
export const TASTE_MULTI_IDS = ["music", "movies", "weekend"] as const;

export type Person = {
  id: string;
  gender: Gender;
  lookingFor: LookingFor;
  answers: Answers;
};

/** Разбивка по блокам в процентах (0..100) — хранится в matches.breakdown. */
export type Breakdown = { psychology: number; lifestyle: number; tastes: number };

export type Compatibility = {
  /** Балл до штрафа за красные флаги, 0..100 без округления — для ранжирования. */
  base: number;
  breakdown: Breakdown;
};

// ── Предпочтения ────────────────────────────────────────────────────────────────

function wants(seeker: Person, other: Person) {
  return seeker.lookingFor === "any" || seeker.lookingFor === other.gender;
}

/** Двое попадают в выдачу друг друга, только если предпочтения совпадают взаимно. */
export function isMutualMatch(a: Person, b: Person): boolean {
  return a.id !== b.id && wants(a, b) && wants(b, a);
}

// ── Психология ──────────────────────────────────────────────────────────────────

const num = (v: AnswerValue | undefined) => (typeof v === "number" ? v : 3);
const norm = (score1to5: number) => (score1to5 - 1) / 4;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

const SIMILARITY_TRAITS: BigFiveTrait[] = ["openness", "conscientiousness", "extraversion"];
const LEVEL_TRAITS: BigFiveTrait[] = ["agreeableness", "stability"];

/** Черты «Большой пятёрки» в диапазоне 0..1; обратные утверждения переворачиваются (6 − ответ). */
export function traitScores(answers: Answers): Record<BigFiveTrait, number> {
  const sums = {} as Record<BigFiveTrait, number[]>;
  for (const q of QUESTIONS) {
    if (q.type !== "scale" || !isBigFive(q.trait)) continue;
    const raw = num(answers[q.id]);
    (sums[q.trait] ??= []).push(q.reverse ? 6 - raw : raw);
  }
  return Object.fromEntries(
    Object.entries(sums).map(([trait, xs]) => [trait, norm(mean(xs))]),
  ) as Record<BigFiveTrait, number>;
}

function isBigFive(trait: string): trait is BigFiveTrait {
  return [...SIMILARITY_TRAITS, ...LEVEL_TRAITS].includes(trait as BigFiveTrait);
}

export function traitsScore(a: Answers, b: Answers): number {
  const ta = traitScores(a);
  const tb = traitScores(b);
  const parts = [
    ...SIMILARITY_TRAITS.map((t) => 1 - Math.abs(ta[t] - tb[t])),
    ...LEVEL_TRAITS.map((t) => (ta[t] + tb[t]) / 2),
  ];
  return mean(parts);
}

export function valuesScore(a: Answers, b: Answers): number {
  return VALUE_IDS.filter((id) => a[id] === b[id]).length / VALUE_IDS.length;
}

export function hasKidsConflict(a: Answers, b: Answers): boolean {
  return (a.kids === "yes" && b.kids === "no") || (a.kids === "no" && b.kids === "yes");
}

export type AttachmentStyle = "secure" | "anxious" | "avoidant" | "mixed";

/** Тревожность и избегание (0..1) и итоговый стиль привязанности. */
export function attachmentProfile(answers: Answers) {
  const anxiety = norm(num(answers.att_anxiety));
  // Избегание: нужна своя территория, мало нужна близость, уходит в себя в ссоре.
  const avoidance = norm(
    mean([num(answers.att_space), 6 - num(answers.att_closeness), 6 - num(answers.att_conflict)]),
  );

  let style: AttachmentStyle = "mixed";
  if (anxiety <= 0.5 && avoidance <= 0.5) style = "secure";
  else if (anxiety > 0.5 && anxiety >= avoidance) style = "anxious";
  else if (avoidance > 0.5 && avoidance > anxiety) style = "avoidant";

  return { anxiety, avoidance, style, security: 1 - Math.max(anxiety, avoidance) };
}

export const SECURE_BONUS = 0.2;
export const ANXIOUS_AVOIDANT_PENALTY = 0.4;

export function attachmentScore(a: Answers, b: Answers): number {
  const pa = attachmentProfile(a);
  const pb = attachmentProfile(b);
  let score = (pa.security + pb.security) / 2;
  if (pa.style === "secure" && pb.style === "secure") score += SECURE_BONUS;
  const styles = new Set([pa.style, pb.style]);
  if (styles.has("anxious") && styles.has("avoidant")) score -= ANXIOUS_AVOIDANT_PENALTY;
  return clamp01(score);
}

export function psychologyScore(a: Answers, b: Answers): number {
  const w = PSYCHOLOGY_WEIGHTS;
  const score =
    w.traits * traitsScore(a, b) + w.values * valuesScore(a, b) + w.attachment * attachmentScore(a, b);
  return clamp01(score - (hasKidsConflict(a, b) ? KIDS_CONFLICT_PENALTY : 0));
}

// ── Образ жизни ─────────────────────────────────────────────────────────────────

export function lifestyleScore(a: Answers, b: Answers): number {
  let matched = 0;
  let total = 0;
  for (const [id, weight] of Object.entries(LIFESTYLE_WEIGHTS)) {
    total += weight;
    if (a[id] === b[id]) matched += weight;
  }
  return matched / total;
}

// ── Вкусы ───────────────────────────────────────────────────────────────────────

const list = (v: AnswerValue | undefined) => (Array.isArray(v) ? v : []);

/** Коэффициент Жаккара: пересечение делённое на объединение. */
export function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  const union = new Set([...sa, ...sb]).size;
  if (union === 0) return 0;
  return [...sa].filter((x) => sb.has(x)).length / union;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function tastesScore(a: Answers, b: Answers, daySimilarity: number | null): number {
  const multi = mean(TASTE_MULTI_IDS.map((id) => jaccard(list(a[id]), list(b[id]))));
  if (daySimilarity === null) return multi;
  return 0.5 * multi + 0.5 * clamp01(daySimilarity);
}

// ── Итог ────────────────────────────────────────────────────────────────────────

export function compatibility(
  a: Person,
  b: Person,
  daySimilarity: number | null = null,
): Compatibility {
  const p = psychologyScore(a.answers, b.answers);
  const l = lifestyleScore(a.answers, b.answers);
  const t = tastesScore(a.answers, b.answers, daySimilarity);
  return {
    base: 100 * (BLOCK_WEIGHTS.psychology * p + BLOCK_WEIGHTS.lifestyle * l + BLOCK_WEIGHTS.tastes * t),
    breakdown: {
      psychology: Math.round(100 * p),
      lifestyle: Math.round(100 * l),
      tastes: Math.round(100 * t),
    },
  };
}

/** Итоговый процент: минус 15 за каждый красный флаг, округление, не ниже нуля. */
export function finalScore(base: number, redFlags: number): number {
  return Math.max(0, Math.round(base - RED_FLAG_PENALTY * redFlags));
}

// ── Факты о паре: сильные совпадения и главное различие (для объяснения от ИИ) ─

export type PairFact = { topic: string; text: string; weight: number };

const TRAIT_TOPICS: Record<BigFiveTrait, string> = {
  openness: "любопытство к новому",
  conscientiousness: "организованность",
  extraversion: "общительность",
  agreeableness: "доброжелательность",
  stability: "спокойствие",
};

// Насколько важно совпадение и различие по вопросу (для выбора, о чём говорить).
const MATCH_WEIGHT: Record<string, number> = {
  kids: 2.5, chronotype: 2, habits: 2, parties: 1.8, place: 1.6, money: 1.5, pets: 1.5, food: 1.2,
};
const DIFF_WEIGHT: Record<string, number> = {
  kids: 2, chronotype: 3, habits: 2.5, parties: 2.2, money: 2.2, place: 2, pets: 2, religion: 1.8,
  relocation: 1.5, priority: 1.5, sport: 1.3, food: 1.2,
};

// Порядок вариантов там, где он осмысленный: дальние ответы — более заметное различие.
const ORDINAL: Record<string, string[]> = {
  kids: ["yes", "maybe", "no"],
  money: ["save", "balance", "spend"],
  priority: ["career", "balance", "family"],
  place: ["city", "suburb", "nature"],
  relocation: ["yes", "maybe", "no"],
  religion: ["important", "neutral", "none"],
  chronotype: ["lark", "flexible", "owl"],
  sport: ["never", "sometimes", "regular", "life"],
  parties: ["0", "1-2", "3-5", "6+"],
  habits: ["none", "drink_sometimes", "drink", "smoke"],
  pets: ["have", "want", "against"],
};

function distance(id: string, x: string, y: string): number {
  const order = ORDINAL[id];
  if (!order) return 1;
  return Math.abs(order.indexOf(x) - order.indexOf(y)) / (order.length - 1);
}

const label = (q: ChoiceQuestion | MultiQuestion, value: string) =>
  q.options.find((o) => o.value === value)?.label ?? value;

/** Все совпадения и различия пары с весами — без сырых ответов, только темы и подписи вариантов. */
export function pairFacts(a: Answers, b: Answers) {
  const matches: PairFact[] = [];
  const differences: PairFact[] = [];

  for (const q of QUESTIONS) {
    if (q.type === "choice") {
      const va = String(a[q.id]);
      const vb = String(b[q.id]);
      const topic = q.topic ?? q.id;
      if (va === vb) {
        matches.push({ topic, text: `${topic}: оба выбрали «${label(q, va)}»`, weight: MATCH_WEIGHT[q.id] ?? 1 });
      } else {
        const hard = q.id === "kids" && hasKidsConflict(a, b);
        const weight = hard ? 5 : (DIFF_WEIGHT[q.id] ?? 1) * (0.5 + 0.5 * distance(q.id, va, vb));
        differences.push({
          topic,
          text: `${topic}: у одного «${label(q, va)}», у другого «${label(q, vb)}»`,
          weight,
        });
      }
    }
    if (q.type === "multi") {
      const common = list(a[q.id]).filter((v) => list(b[q.id]).includes(v));
      if (common.length) {
        matches.push({
          topic: q.topic ?? q.id,
          text: `${q.topic}: общее — ${common.map((v) => label(q, v).toLowerCase()).join(", ")}`,
          weight: 1 + 0.4 * common.length,
        });
      }
    }
  }

  const ta = traitScores(a);
  const tb = traitScores(b);
  for (const t of SIMILARITY_TRAITS) {
    const diff = Math.abs(ta[t] - tb[t]);
    if (diff <= 0.125) matches.push({ topic: TRAIT_TOPICS[t], text: `похожая ${TRAIT_TOPICS[t]}`, weight: 1.2 });
    else if (diff >= 0.5)
      differences.push({ topic: TRAIT_TOPICS[t], text: `сильно разная ${TRAIT_TOPICS[t]}`, weight: 2 * diff });
  }
  for (const t of LEVEL_TRAITS) {
    if (ta[t] >= 0.75 && tb[t] >= 0.75)
      matches.push({ topic: TRAIT_TOPICS[t], text: `оба с высокой чертой «${TRAIT_TOPICS[t]}»`, weight: 1.2 });
  }

  const byWeight = (x: PairFact, y: PairFact) => y.weight - x.weight;
  return { matches: matches.sort(byWeight), differences: differences.sort(byWeight) };
}

/** 3 самых сильных совпадения и 1 главное различие — вход для объяснения пары. */
export function pairHighlights(a: Answers, b: Answers) {
  const { matches, differences } = pairFacts(a, b);
  return { strongest: matches.slice(0, 3), difference: differences[0] ?? null };
}
