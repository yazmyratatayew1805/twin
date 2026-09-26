"use server";

import { redirect } from "next/navigation";
import type { Answers } from "@/config/questions";
import { embedText, toPgVector } from "@/lib/ai/embeddings";
import { computeMatchesFor } from "@/lib/matching-service";
import { answersSchema } from "@/lib/quiz";
import { rateLimit } from "@/lib/rate-limit";
import { getUserContext } from "@/lib/supabase/context";

export type SubmitState = { error?: string };

export async function submitAnswers(answers: Answers): Promise<SubmitState> {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");

  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("id")
    .eq("id", ctx.user.id)
    .maybeSingle();
  if (!profile) redirect("/profile");

  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { error: "Кажется, пропущен вопрос. Вернитесь назад и проверьте." };

  if (!(await rateLimit(`quiz:${ctx.user.id}`, 5, 3600, { failOpen: true }))) {
    return { error: "Анкету можно отправлять не чаще 5 раз в час. Алгоритму нужно передохнуть." };
  }

  // Эмбеддинг «идеального дня». Если OpenAI недоступен — сохраняем без него,
  // его можно досчитать позже (scripts/backfill-embeddings.ts).
  const embedding = (await rateLimit(`embed:${ctx.user.id}`, 5, 3600, { failOpen: false }))
    ? await embedText(String(parsed.data.ideal_day))
    : null;

  // Записывает только сервер: у пользователя нет прав на INSERT в answers.
  const { error } = await ctx.supabaseAdmin.from("answers").upsert({
    user_id: ctx.user.id,
    answers: parsed.data,
    day_embedding: embedding ? toPgVector(embedding) : null,
    completed_at: new Date().toISOString(),
  });
  if (error) {
    console.error("submitAnswers failed:", error.message);
    return { error: "Не получилось сохранить ответы. Попробуйте ещё раз." };
  }

  // Совместимость со всеми остальными. Ошибка расчёта не теряет анкету:
  // ответы уже сохранены, пары восстановит «пересчитать всё» в админке.
  try {
    await computeMatchesFor(ctx.supabaseAdmin, ctx.user.id);
  } catch (e) {
    console.error("computeMatchesFor failed:", e instanceof Error ? e.message : e);
  }

  redirect("/results");
}
