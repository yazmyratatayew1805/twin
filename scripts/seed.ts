// Seed: 10 вымышленных участников + полный пересчёт совместимости.
//   npm run seed          — пересоздать seed-участников и посчитать пары
//   npm run seed -- --reset — только удалить seed-участников
// Запускается с --conditions=react-server, чтобы переиспользовать серверные модули приложения.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

// Локальная сеть (VPN) рвёт соединения — seed повторяет запросы при сетевых ошибках.
// Тело запросов supabase-js — строка, поэтому повтор безопасен.
const retryingFetch: typeof fetch = async (input, init) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (attempt >= 6) throw error;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
};

const EMAIL_PREFIX = "twin-seed-";
const EMAIL_DOMAIN = "@example.com";

async function main() {
  const { embedText, toPgVector } = await import("../src/lib/ai/embeddings");
  const { recalculateAll } = await import("../src/lib/matching-service");
  const { SEED_PROFILES } = await import("./seed-profiles");

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: retryingFetch },
  });

  // Удаляем прежних seed-участников (каскадом уходят профили, ответы и пары).
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const old = list.users.filter((u) => u.email?.startsWith(EMAIL_PREFIX));
  for (const u of old) {
    // Сеть бывает нестабильной: ошибку удаления не глотаем, а повторяем.
    for (let attempt = 1; ; attempt++) {
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (!error) break;
      if (attempt === 3) throw new Error(`Не удалось удалить ${u.email}: ${error.message}`);
    }
  }
  console.log(`Удалено seed-участников: ${old.length}`);
  if (process.argv.includes("--reset")) return;

  if (!process.env.GEMINI_API_KEY)
    console.log("GEMINI_API_KEY нет — без эмбеддингов («Вкусы» только по Жаккару) и без проверки красных флагов.");

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
