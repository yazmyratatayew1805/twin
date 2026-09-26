import "server-only";
import { EMBEDDING_MODEL, geminiClient, withinEmbedBudget, withRetry } from "./gemini";

/** Размер вектора совпадает с колонкой answers.day_embedding vector(1536). */
export const EMBEDDING_DIMENSIONS = 1536;

/** Эмбеддинг текста или null, если ключа нет, бюджет исчерпан или API недоступен — приложение не падает. */
export async function embedText(text: string): Promise<number[] | null> {
  const ai = geminiClient();
  if (!ai || !(await withinEmbedBudget())) return null;
  try {
    const res = await withRetry(() =>
      ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: { taskType: "SEMANTIC_SIMILARITY", outputDimensionality: EMBEDDING_DIMENSIONS },
      }),
    );
    const values = res.embeddings?.[0]?.values;
    return values?.length === EMBEDDING_DIMENSIONS ? values : null;
  } catch (error) {
    console.error("embedText failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Формат, который pgvector принимает через PostgREST. */
export function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
