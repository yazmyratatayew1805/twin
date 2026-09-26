import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

// Бесплатный тариф Google AI Studio. Модели можно поменять переменными окружения.
export const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash-lite";
export const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";

// Дневные лимиты с запасом до квоты бесплатного тарифа. Когда лимит исчерпан —
// приложение не падает: объяснения становятся шаблонными, флаги не проверяются.
const DAILY_TEXT_LIMIT = Number(process.env.GEMINI_DAILY_TEXT_LIMIT || 900);
const DAILY_EMBED_LIMIT = Number(process.env.GEMINI_DAILY_EMBED_LIMIT || 900);

let client: GoogleGenAI | null = null;

export function geminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  client ??= new GoogleGenAI({ apiKey, httpOptions: { timeout: 25_000 } });
  return client;
}

export function withinTextBudget() {
  return rateLimit("llm:gemini:text:daily", DAILY_TEXT_LIMIT, 86400, { failOpen: false });
}

export function withinEmbedBudget() {
  return rateLimit("llm:gemini:embed:daily", DAILY_EMBED_LIMIT, 86400, { failOpen: false });
}

/** Сетевые сбои и 5xx повторяем; 4xx (включая 429 — квота) повторять бессмысленно. */
function retryable(error: unknown) {
  if (error instanceof ApiError) return error.status >= 500;
  return true;
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i >= attempts || !retryable(error)) throw error;
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}

function jsonSchemaFor(schema: z.ZodType) {
  // Gemini понимает подмножество JSON Schema — служебный $schema убираем.
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/**
 * Запрос к текстовой модели с ответом строго по схеме.
 * Возвращает null без ключа, при исчерпанном бюджете, ошибке API или ответе не по схеме.
 */
export async function generateJson<T>(
  schema: z.ZodType<T>,
  { system, prompt, temperature = 0.7 }: { system: string; prompt: string; temperature?: number },
): Promise<T | null> {
  const ai = geminiClient();
  if (!ai || !(await withinTextBudget())) return null;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: system,
          temperature,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchemaFor(schema),
        },
      }),
    );
    const parsed = schema.safeParse(JSON.parse(response.text ?? "null"));
    if (!parsed.success) {
      console.error("Gemini: ответ не по схеме", parsed.error.issues[0]?.message);
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.error("Gemini generateJson failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
