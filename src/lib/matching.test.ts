import { describe, expect, it } from "vitest";
import { SEED_PROFILES, type SeedProfile } from "../../scripts/seed-profiles";
import type { Answers } from "@/config/questions";
import { answersSchema } from "./quiz";
import {
  ANXIOUS_AVOIDANT_PENALTY,
  attachmentProfile,
  attachmentScore,
  compatibility,
  cosineSimilarity,
  finalScore,
  hasKidsConflict,
  isMutualMatch,
  jaccard,
  lifestyleScore,
  pairHighlights,
  psychologyScore,
  SECURE_BONUS,
  tastesScore,
  traitScores,
  traitsScore,
  valuesScore,
  type Person,
} from "./matching";

const seed = Object.fromEntries(SEED_PROFILES.map((p) => [p.key, p])) as Record<string, SeedProfile>;
const person = (p: SeedProfile): Person => ({
  id: p.key,
  gender: p.gender,
  lookingFor: p.looking_for,
  answers: p.answers,
});
const base = seed.sasha.answers;
const withAnswers = (patch: Answers): Answers => ({ ...base, ...patch });

describe("взаимные предпочтения", () => {
  it("пара подходит, только если оба ищут друг друга", () => {
    expect(isMutualMatch(person(seed.anya), person(seed.max))).toBe(true);
    expect(isMutualMatch(person(seed.lena), person(seed.katya))).toBe(true);
    // Лена ищет женщину — мужчины ей не подходят, и наоборот.
    expect(isMutualMatch(person(seed.lena), person(seed.max))).toBe(false);
    // Тимур ищет мужчину, Саша — кого угодно: взаимно.
    expect(isMutualMatch(person(seed.timur), person(seed.sasha))).toBe(true);
    // Саша ищет кого угодно, но Макс ищет женщину — не взаимно.
    expect(isMutualMatch(person(seed.sasha), person(seed.max))).toBe(false);
  });

  it("человек не совпадает сам с собой", () => {
    expect(isMutualMatch(person(seed.sasha), person(seed.sasha))).toBe(false);
  });
});

describe("психология", () => {
  it("обратные утверждения переворачиваются", () => {
    const t = traitScores(withAnswers({ o1: 5, o2: 1 }));
    expect(t.openness).toBe(1);
    const t2 = traitScores(withAnswers({ o1: 5, o2: 5 }));
    expect(t2.openness).toBe(0.5);
  });

  it("открытость, добросовестность, экстраверсия — сходство; доброжелательность и стабильность — уровень", () => {
    const low = withAnswers({ a1: 1, a2: 5, s1: 1, s2: 5 });
    const high = withAnswers({ a1: 5, a2: 1, s1: 5, s2: 1 });
    // Двое одинаково недоброжелательных совпадают хуже, чем двое доброжелательных.
    expect(traitsScore(high, high)).toBeGreaterThan(traitsScore(low, low));
    // Разная экстраверсия снижает балл.
    const intro = withAnswers({ e1: 1, e2: 5 });
    const extra = withAnswers({ e1: 5, e2: 1 });
    expect(traitsScore(intro, extra)).toBeLessThan(traitsScore(intro, intro));
  });

  it("ценности — доля совпавших ответов", () => {
    expect(valuesScore(base, base)).toBe(1);
    expect(valuesScore(base, withAnswers({ money: "save", religion: "none" }))).toBeCloseTo(4 / 6);
  });

  it("жёсткое расхождение по детям — штраф 0.3 внутри блока", () => {
    const yes = withAnswers({ kids: "yes" });
    const no = withAnswers({ kids: "no" });
    const maybe = withAnswers({ kids: "maybe" });
    expect(hasKidsConflict(yes, no)).toBe(true);
    expect(hasKidsConflict(yes, maybe)).toBe(false);
    // В обоих случаях ответы по детям не совпали, разница — только штраф.
    expect(psychologyScore(yes, maybe) - psychologyScore(yes, no)).toBeCloseTo(0.3);
  });

  it("стиль привязанности: оба надёжные — бонус, тревожный + избегающий — штраф", () => {
    const secure = withAnswers({ att_closeness: 4, att_anxiety: 1, att_space: 2, att_conflict: 5 });
    const anxious = withAnswers({ att_closeness: 5, att_anxiety: 5, att_space: 1, att_conflict: 3 });
    const avoidant = withAnswers({ att_closeness: 1, att_anxiety: 1, att_space: 5, att_conflict: 1 });

    expect(attachmentProfile(secure).style).toBe("secure");
    expect(attachmentProfile(anxious).style).toBe("anxious");
    expect(attachmentProfile(avoidant).style).toBe("avoidant");

    const sec = attachmentProfile(secure).security;
    expect(attachmentScore(secure, secure)).toBeCloseTo(Math.min(1, sec + SECURE_BONUS));
    const mixedAvg = (attachmentProfile(anxious).security + attachmentProfile(avoidant).security) / 2;
    expect(attachmentScore(anxious, avoidant)).toBeCloseTo(Math.max(0, mixedAvg - ANXIOUS_AVOIDANT_PENALTY));
  });
});

describe("образ жизни", () => {
  it("хронотип и алкоголь/курение весят вдвое больше остальных", () => {
    expect(lifestyleScore(base, base)).toBe(1);
    expect(lifestyleScore(base, withAnswers({ chronotype: "lark" }))).toBeCloseTo(6 / 8);
    expect(lifestyleScore(base, withAnswers({ habits: "smoke" }))).toBeCloseTo(6 / 8);
    expect(lifestyleScore(base, withAnswers({ sport: "life" }))).toBeCloseTo(7 / 8);
  });
});

describe("вкусы", () => {
  it("коэффициент Жаккара: пересечение делённое на объединение", () => {
    expect(jaccard(["a", "b"], ["b", "c"])).toBeCloseTo(1 / 3);
    expect(jaccard(["a"], ["a"])).toBe(1);
    expect(jaccard([], [])).toBe(0);
  });

  it("косинусное сходство", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("50% Жаккар + 50% эмбеддинги; без эмбеддинга — только Жаккар", () => {
    const other = withAnswers({ music: ["jazz"], movies: ["horror"], weekend: ["bar"] });
    expect(tastesScore(base, other, null)).toBe(0);
    expect(tastesScore(base, other, 0.8)).toBeCloseTo(0.4);
    expect(tastesScore(base, base, null)).toBe(1);
    expect(tastesScore(base, base, 1)).toBe(1);
  });
});

describe("итоговый процент", () => {
  it("взвешенная сумма блоков 45/25/30", () => {
    const a = person(seed.anya);
    const b = person(seed.max);
    const { base: score } = compatibility(a, b, 0.6);
    const expected =
      100 *
      (0.45 * psychologyScore(a.answers, b.answers) +
        0.25 * lifestyleScore(a.answers, b.answers) +
        0.3 * tastesScore(a.answers, b.answers, 0.6));
    expect(score).toBeCloseTo(expected);
  });

  it("минус 15 за каждый красный флаг, округление, не ниже нуля", () => {
    expect(finalScore(72.4, 0)).toBe(72);
    expect(finalScore(72.6, 1)).toBe(58);
    expect(finalScore(72.6, 2)).toBe(43);
    expect(finalScore(20, 2)).toBe(0);
  });

  it("одинаковые ответы дают высокий процент", () => {
    const s = person(seed.olga);
    expect(finalScore(compatibility(s, { ...s, id: "clone" }, 1).base, 0)).toBeGreaterThanOrEqual(90);
  });
});

describe("объяснение пары: сильные совпадения и главное различие", () => {
  it("3 совпадения и различие; расхождение по детям — главное", () => {
    const h = pairHighlights(seed.olga.answers, seed.denis.answers);
    expect(h.difference?.topic).toBe("дети");
    const h2 = pairHighlights(seed.olga.answers, seed.igor.answers);
    expect(h2.strongest).toHaveLength(3);
    expect(h2.difference).not.toBeNull();
  });
});

describe("seed: 10 тестовых профилей", () => {
  const score = (x: string, y: string) =>
    finalScore(compatibility(person(seed[x]), person(seed[y])).base, 0);

  it("все анкеты seed проходят серверную валидацию", () => {
    for (const p of SEED_PROFILES) expect(answersSchema.safeParse(p.answers).success, p.key).toBe(true);
  });

  it("задуманные пары совместимы сильнее несовместимых", () => {
    expect(score("olga", "igor")).toBeGreaterThan(score("olga", "denis") + 30);
    expect(score("anya", "max")).toBeGreaterThan(score("anya", "igor"));
    expect(score("vika", "sasha")).toBeGreaterThan(score("vika", "denis"));
    expect(score("lena", "katya")).toBeGreaterThanOrEqual(70);
  });

  it("алгоритм не выдаёт всем одинаковые проценты", () => {
    const people = SEED_PROFILES.map(person);
    const scores: number[] = [];
    for (let i = 0; i < people.length; i++)
      for (let j = i + 1; j < people.length; j++)
        if (isMutualMatch(people[i], people[j])) scores.push(finalScore(compatibility(people[i], people[j]).base, 0));
    expect(scores.length).toBeGreaterThanOrEqual(8);
    expect(Math.max(...scores) - Math.min(...scores)).toBeGreaterThanOrEqual(35);
  });
});
