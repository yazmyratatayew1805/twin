import { z } from "zod";
import { QUESTIONS, type Answers, type Question } from "@/config/questions";

function questionSchema(q: Question) {
  switch (q.type) {
    case "scale":
      return z.number().int().min(1).max(5);
    case "choice":
      return z.enum(q.options.map((o) => o.value) as [string, ...string[]]);
    case "multi":
      return z
        .array(z.enum(q.options.map((o) => o.value) as [string, ...string[]]))
        .min(1)
        .max(q.max)
        .refine((v) => new Set(v).size === v.length);
    case "text":
      return z.string().trim().min(q.minLength).max(q.maxLength);
  }
}

// Строгая схема по конфигу: все вопросы обязательны, лишних ключей нет.
export const answersSchema = z.strictObject(
  Object.fromEntries(QUESTIONS.map((q) => [q.id, questionSchema(q)])),
);

export function isAnswered(q: Question, value: Answers[string] | undefined): boolean {
  return questionSchema(q).safeParse(value).success;
}
