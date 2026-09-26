"use server";

import { redirect } from "next/navigation";
import {
  CODE_TTL_MS,
  computePair,
  generateCode,
  isExpired,
  isValidCodeFormat,
  leaveGeneralPool,
  normalizeCode,
  type PairCheck,
} from "@/lib/pair";
import { rateLimit } from "@/lib/rate-limit";
import { getUserContext } from "@/lib/supabase/context";

export type JoinState = { error?: string };

async function requireReadyUser() {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");
  const { data: answers } = await ctx.supabaseAdmin
    .from("answers")
    .select("user_id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (!answers) redirect("/pair");
  return ctx;
}

/** Первый участник: получает 6-значный код (действует 24 часа, одноразовый). */
export async function createPairCode() {
  const { user, supabaseAdmin: admin } = await requireReadyUser();

  // Уже есть свежий неиспользованный код — отдаём его, а не плодим новые.
  const { data: active } = await admin
    .from("pair_checks")
    .select("code")
    .eq("creator_id", user.id)
    .is("partner_id", null)
    .gt("created_at", new Date(Date.now() - CODE_TTL_MS).toISOString())
    .limit(1)
    .maybeSingle();
  if (active) redirect(`/pair/${active.code}`);

  if (!(await rateLimit(`pair:create:${user.id}`, 5, 3600, { failOpen: true }))) {
    redirect("/pair?error=too-many");
  }

  let code: string | null = null;
  for (let attempt = 0; attempt < 5 && !code; attempt++) {
    const candidate = generateCode();
    const { error } = await admin.from("pair_checks").insert({ code: candidate, creator_id: user.id });
    if (!error) code = candidate;
    else if (error.code !== "23505") throw new Error(`createPairCode: ${error.message}`); // 23505 — такой код уже есть
  }
  if (!code) throw new Error("createPairCode: не удалось подобрать свободный код");

  // Вариант А: участник проверки пары уходит из общей выдачи.
  await leaveGeneralPool(admin, [user.id]);
  redirect(`/pair/${code}`);
}

/** Второй участник: вводит код и получает результат пары. */
export async function joinPairCode(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const { user, supabaseAdmin: admin } = await requireReadyUser();

  // Защита от перебора кодов.
  if (!(await rateLimit(`pair:join:${user.id}`, 10, 600, { failOpen: true }))) {
    return { error: "Слишком много попыток. Передохните десять минут." };
  }

  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (!isValidCodeFormat(code)) return { error: "В коде 6 символов — латинские буквы и цифры." };

  const { data: check } = await admin.from("pair_checks").select("*").eq("code", code).maybeSingle<PairCheck>();
  if (!check) return { error: "Такого кода нет. Проверьте ещё раз — или попросите продиктовать медленнее." };
  if (check.creator_id === user.id) return { error: "Это ваш собственный код. Отправьте его второй половинке." };
  if (check.partner_id === user.id) redirect(`/pair/${code}`);
  if (check.partner_id) return { error: "Этот код уже использован. Он одноразовый." };
  if (isExpired(check)) return { error: "Код просрочен: он живёт 24 часа. Попросите новый." };

  const result = await computePair(admin, check.creator_id, user.id);
  if (!result) return { error: "Кто-то из вас ещё не прошёл анкету." };

  // Одноразовость гарантирует база: обновляем, только если партнёра ещё нет.
  const { data: updated, error } = await admin
    .from("pair_checks")
    .update({
      partner_id: user.id,
      score: result.score,
      breakdown: result.breakdown,
      explanation: result.explanation,
    })
    .eq("code", code)
    .is("partner_id", null)
    .select("code");
  if (error) throw new Error(`joinPairCode: ${error.message}`);
  if (!updated?.length) return { error: "Этот код только что использовали. Он одноразовый." };

  await leaveGeneralPool(admin, [check.creator_id, user.id]);
  redirect(`/pair/${code}`);
}
