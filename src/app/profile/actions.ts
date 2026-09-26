"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { GENDERS, LOOKING_FOR, MIN_AGE, UNDERAGE_COOKIE } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string };

const schema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, "Ник короче двух букв — даже в «Жуках» так не называют")
    .max(30, "Ник длиннее 30 символов не влезет в кадр"),
  age: z.coerce
    .number("Укажите возраст числом")
    .int("Возраст — целое число")
    .min(1, "Укажите настоящий возраст")
    .max(120, "Укажите настоящий возраст"),
  gender: z.enum(Object.keys(GENDERS) as [keyof typeof GENDERS], "Выберите пол"),
  looking_for: z.enum(Object.keys(LOOKING_FOR) as [keyof typeof LOOKING_FOR], "Выберите, кого ищете"),
});

export async function saveProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const values = parsed.data;

  // Младше 18 — сервис закрыт: удаляем аккаунт целиком и запоминаем браузер.
  if (values.age < MIN_AGE) {
    await deleteUserAndSignOut(ctx.user.id);
    (await cookies()).set(UNDERAGE_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    redirect("/blocked");
  }

  const { data: existing } = await ctx.supabase
    .from("profiles")
    .select("id")
    .eq("id", ctx.user.id)
    .maybeSingle();

  // UPDATE разрешён только для анкетных полей (см. миграцию), поэтому без upsert.
  const { error } = existing
    ? await ctx.supabase.from("profiles").update(values).eq("id", ctx.user.id)
    : await ctx.supabase.from("profiles").insert({ id: ctx.user.id, ...values });

  if (error) return { error: "Не получилось сохранить профиль. Попробуйте ещё раз." };

  redirect(existing ? "/profile?saved=1" : "/quiz");
}

export async function deleteAccount() {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");

  await deleteUserAndSignOut(ctx.user.id);
  redirect("/?deleted=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Удаление пользователя из auth каскадом стирает profiles, answers, matches и pair_checks.
async function deleteUserAndSignOut(userId: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) throw new Error("Не удалось удалить аккаунт");
}
