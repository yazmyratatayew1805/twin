import { describe, expect, it } from "vitest";
import { QUESTIONS, type Answers } from "@/config/questions";
import { answersSchema } from "./quiz";

function validAnswers(): Answers {
  return Object.fromEntries(
    QUESTIONS.map((q) => {
      switch (q.type) {
        case "scale":
          return [q.id, 3];
        case "choice":
          return [q.id, q.options[0].value];
        case "multi":
          return [q.id, q.options.slice(0, q.max).map((o) => o.value)];
        case "text":
          return [q.id, "а".repeat(q.minLength)];
      }
    }),
  );
}

describe("анкета", () => {
  it("около 30 вопросов в трёх блоках", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(28);
    expect(QUESTIONS.length).toBeLessThanOrEqual(32);
    expect(new Set(QUESTIONS.map((q) => q.block))).toEqual(new Set(["psychology", "lifestyle", "tastes"]));
  });

  it("id вопросов уникальны", () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });

  it("по 2 утверждения на черту «Большой пятёрки»: прямое и обратное", () => {
    for (const trait of ["openness", "conscientiousness", "extraversion", "agreeableness", "stability"]) {
      const items = QUESTIONS.filter((q) => q.type === "scale" && q.trait === trait);
      expect(items).toHaveLength(2);
      expect(items.filter((q) => q.type === "scale" && q.reverse)).toHaveLength(1);
    }
  });
});

describe("answersSchema", () => {
  it("принимает полностью заполненную анкету", () => {
    expect(answersSchema.safeParse(validAnswers()).success).toBe(true);
  });

  it("отклоняет пропущенный вопрос", () => {
    const answers = validAnswers();
    delete answers.kids;
    expect(answersSchema.safeParse(answers).success).toBe(false);
  });

  it("отклоняет лишние ключи", () => {
    expect(answersSchema.safeParse({ ...validAnswers(), is_admin: true }).success).toBe(false);
  });

  it("отклоняет балл вне шкалы 1–5", () => {
    expect(answersSchema.safeParse({ ...validAnswers(), o1: 6 }).success).toBe(false);
  });

  it("отклоняет неизвестный вариант ответа", () => {
    expect(answersSchema.safeParse({ ...validAnswers(), chronotype: "vampire" }).success).toBe(false);
  });

  it("отклоняет мультивыбор больше лимита и повторы", () => {
    const music = QUESTIONS.find((q) => q.id === "music")!;
    const all = music.type === "multi" ? music.options.map((o) => o.value) : [];
    expect(answersSchema.safeParse({ ...validAnswers(), music: all }).success).toBe(false);
    expect(answersSchema.safeParse({ ...validAnswers(), music: ["rock", "rock"] }).success).toBe(false);
  });

  it("отклоняет слишком короткий «идеальный день»", () => {
    expect(answersSchema.safeParse({ ...validAnswers(), ideal_day: "Сплю" }).success).toBe(false);
  });
});
