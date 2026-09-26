// Досчитывает эмбеддинг «идеального дня» для анкет, где его нет
// (например, анкету прошли, пока не было ключа Gemini или API был недоступен).
// Запуск: npm run embeddings:backfill
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

async function main() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY не задан в .env.local");
  const { embedText, toPgVector } = await import("../src/lib/ai/embeddings");

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });

  const { data: rows, error } = await supabase
    .from("answers")
    .select("user_id, answers")
    .is("day_embedding", null);
  if (error) throw error;

  console.log(`Без эмбеддинга: ${rows.length}`);
  for (const row of rows) {
    const text = String(row.answers?.ideal_day ?? "").trim();
    if (!text) continue;
    const embedding = await embedText(text);
    if (!embedding) {
      console.log(`✗ ${row.user_id}: Gemini не ответил (ключ, лимит или сеть)`);
      continue;
    }
    const { error: updateError } = await supabase
      .from("answers")
      .update({ day_embedding: toPgVector(embedding) })
      .eq("user_id", row.user_id);
    console.log(updateError ? `✗ ${row.user_id}: ${updateError.message}` : `✓ ${row.user_id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
