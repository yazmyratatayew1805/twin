export type Bucket = { from: number; to: number; count: number };

/** Распределение процентов по корзинам 0–9, 10–19, …, 90–100. */
export function histogram(scores: number[]): Bucket[] {
  const buckets = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: i === 9 ? 100 : i * 10 + 9, count: 0 }));
  for (const s of scores) buckets[Math.min(9, Math.floor(s / 10))].count++;
  return buckets;
}
