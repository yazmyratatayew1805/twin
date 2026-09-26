import { describe, expect, it } from "vitest";
import { SEED_PROFILES } from "../../scripts/seed-profiles";
import { templateExplanation } from "./explanation-template";
import { compatibility, finalScore, pairHighlights } from "./matching";

const seed = Object.fromEntries(SEED_PROFILES.map((p) => [p.key, p]));
const person = (key: string) => ({
  id: key,
  gender: seed[key].gender,
  lookingFor: seed[key].looking_for,
  answers: seed[key].answers,
});

function inputFor(a: string, b: string) {
  const c = compatibility(person(a), person(b));
  return { score: finalScore(c.base, 0), breakdown: c.breakdown, ...pairHighlights(seed[a].answers, seed[b].answers) };
}

describe("шаблонное объяснение", () => {
  it("2–3 предложения, называет сильный блок и обязательно одно различие", () => {
    const input = inputFor("olga", "igor");
    const text = templateExplanation(input);
    // Точки внутри подписей вариантов («Ноль. Батарейка на экономии») — не конец предложения.
    const sentences = text.replace(/«[^»]*»/g, "«…»").split(/(?<=[.!?])\s+/);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
    expect(sentences.length).toBeLessThanOrEqual(3);
    expect(text).toContain("Сильнее всего вас");
    expect(text).toContain(input.difference!.phrase);
    expect(text).toContain("Правда,");
  });

  it("без различий — не выдумывает их", () => {
    const text = templateExplanation({ ...inputFor("olga", "igor"), difference: null });
    expect(text).not.toContain("Правда,");
  });

  it("грамматика фраз о чертах характера", () => {
    const phrases = SEED_PROFILES.flatMap((a) =>
      SEED_PROFILES.map((b) => pairHighlights(a.answers, b.answers).strongest.map((f) => f.phrase)),
    ).flat();
    expect(phrases.some((p) => p.includes("похожая любопытство"))).toBe(false);
  });
});
