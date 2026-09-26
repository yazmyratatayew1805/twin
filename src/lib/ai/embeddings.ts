import "server-only";
import OpenAI from "openai";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

/** Эмбеддинг текста или null, если ключа нет или API недоступен — приложение не должно падать. */
export async function embedText(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const client = new OpenAI({ timeout: 15_000, maxRetries: 2 });
    const res = await client.embeddings.create({ model: EMBEDDING_MODEL, input: text });
    return res.data[0]?.embedding ?? null;
  } catch (error) {
    console.error("embedText failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Формат, который pgvector принимает через PostgREST. */
export function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
