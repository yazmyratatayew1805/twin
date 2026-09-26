// Seed: 10 вымышленных участников + полный пересчёт совместимости.
//   npm run seed          — пересоздать seed-участников и посчитать пары
//   npm run seed -- --reset — только удалить seed-участников
// Запускается с --conditions=react-server, чтобы переиспользовать серверные модули приложения.
import { config } from "dotenv";

config({ path: ".env.local" });

const EMAIL_PREFIX = "twin-seed-";
const EMAIL_DOMAIN = "@example.com";

async function main() {
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { embedText, toPgVector } = await import("../src/lib/ai/embeddings");
  const { recalculateAll } = await import("../src/lib/matching-service");
  const { SEED_PROFILES } = await import("./seed-profiles");

  const admin = createAdminClient();

  // Удаляем прежних seed-участников (каскадом уходят профили, ответы и пары).
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const old = list.users.filter((u) => u.email?.startsWith(EMAIL_PREFIX));
  for (const u of old) await admin.auth.admin.deleteUser(u.id);
  console.log(`Удалено seed-участников: ${old.length}`);
  if (process.argv.includes("--reset")) return;

  if (!process.env.OPENAI_API_KEY) console.log("OPENAI_API_KEY нет — эмбеддинги не считаем, «Вкусы» только по Жаккару.");
  if (!process.env.ANTHROPIC_API_KEY) console.log("ANTHROPIC_API_KEY нет — красные флаги не проверяем.");

  const names = new Map<string, string>();
  for (const p of SEED_PROFILES) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `${EMAIL_PREFIX}${p.key}${EMAIL_DOMAIN}`,
      email_confirm: true,
    });
    if (error) throw error;
    const id = data.user.id;
    names.set(id, p.nickname);

    const { error: profileError } = await admin.from("profiles").insert({
      id,
      nickname: p.nickname,
      age: p.age,
      gender: p.gender,
      looking_for: p.looking_for,
    });
    if (profileError) throw profileError;

    const embedding = await embedText(String(p.answers.ideal_day));
    const { error: answersError } = await admin.from("answers").insert({
      user_id: id,
      answers: p.answers,
      day_embedding: embedding ? toPgVector(embedding) : null,
    });
    if (answersError) throw answersError;
  }
  console.log(`Создано seed-участников: ${SEED_PROFILES.length}`);

  const stats = await recalculateAll(admin);
  console.log(`Пересчёт: участников ${stats.participants}, пар ${stats.pairs}, проверено на флаги ${stats.redFlagsChecked}\n`);

  // Топ-5 для каждого — чтобы глазами проверить правдоподобность выдачи.
  const { data: matches, error } = await admin
    .from("matches")
    .select("user_a, user_b, score, breakdown, red_flags")
    .order("score", { ascending: false });
  if (error) throw error;

  for (const [id, name] of names) {
    const mine = matches
      .filter((m) => m.user_a === id || m.user_b === id)
      .slice(0, 5)
      .map((m) => {
        const other = names.get(m.user_a === id ? m.user_b : m.user_a) ?? "не seed";
        const b = m.breakdown as { psychology: number; lifestyle: number; tastes: number };
        const flags = m.red_flags ? ` 🚩${m.red_flags}` : "";
        return `${other} ${m.score}% (П${b.psychology}/О${b.lifestyle}/В${b.tastes})${flags}`;
      });
    console.log(`${name.padEnd(6)} → ${mine.length ? mine.join(" · ") : "пока никого"}`);
  }

  const scores = matches.map((m) => m.score);
  if (scores.length)
    console.log(`\nРазброс процентов: ${Math.min(...scores)}–${Math.max(...scores)}%, пар всего ${scores.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
