// Досчитывает эмбеддинг «идеального дня» для анкет, где его нет
// (например, анкету прошли, пока не было ключа OpenAI или API был недоступен).
// Запуск: npx tsx scripts/backfill-embeddings.ts
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

config({ path: ".env.local" });

const MODEL = "text-embedding-3-small";

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY не задан в .env.local");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const openai = new OpenAI();

  const { data: rows, error } = await supabase
    .from("answers")
    .select("user_id, answers")
    .is("day_embedding", null);
  if (error) throw error;

  console.log(`Без эмбеддинга: ${rows.length}`);
  for (const row of rows) {
    const text = String(row.answers?.ideal_day ?? "").trim();
    if (!text) continue;
    const res = await openai.embeddings.create({ model: MODEL, input: text });
    const vector = `[${res.data[0].embedding.join(",")}]`;
    const { error: updateError } = await supabase
      .from("answers")
      .update({ day_embedding: vector })
      .eq("user_id", row.user_id);
    console.log(updateError ? `✗ ${row.user_id}: ${updateError.message}` : `✓ ${row.user_id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
