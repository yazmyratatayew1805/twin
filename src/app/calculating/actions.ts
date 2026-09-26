"use server";

import { redirect } from "next/navigation";
import { computeMatchesFor } from "@/lib/matching-service";
import { rateLimit } from "@/lib/rate-limit";
import { getTopMatches } from "@/lib/results";
import { getUserContext } from "@/lib/supabase/context";

/**
 * Считает совместимость (если анкета новее последнего расчёта) и заранее
 * готовит объяснения для топ-5, пока на экране идёт анимация.
 */
export async function runMatching(): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");
  const { user, supabaseAdmin: admin } = ctx;

  const { data: answers } = await admin
    .from("answers")
    .select("completed_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!answers) redirect("/quiz");

  try {
    const { data: latest } = await admin
      .from("matches")
      .select("updated_at")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Перезагрузка страницы не должна пересчитывать всё заново и тратить запросы к ИИ.
    const stale = !latest || new Date(latest.updated_at) < new Date(answers.completed_at);
    if (stale && (await rateLimit(`match:${user.id}`, 10, 3600, { failOpen: true }))) {
      await computeMatchesFor(admin, user.id);
    }
    await getTopMatches(admin, user.id);
  } catch (e) {
    // Ответы сохранены; пары восстановит «пересчитать всё» в админке.
    console.error("runMatching failed:", e instanceof Error ? e.message : e);
  }
}
