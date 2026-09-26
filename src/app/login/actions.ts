"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { UNDERAGE_COOKIE } from "@/lib/profile";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type LoginState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

const schema = z.object({
  email: z.email("Похоже, в адресе опечатка"),
  consent: z.literal("on", "Без согласия на обработку данных алгоритм не запустится"),
});

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if ((await cookies()).get(UNDERAGE_COOKIE)) redirect("/blocked");

  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    consent: formData.get("consent") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }
  const { email } = parsed.data;

  const ip = await clientIp();
  const allowed =
    (await rateLimit(`login:ip:${ip}`, 5, 600, { failOpen: true })) &&
    (await rateLimit(`login:email:${email}`, 3, 3600, { failOpen: true }));
  if (!allowed) {
    return { status: "error", message: "Слишком много попыток. Передохните пару минут и попробуйте снова." };
  }

  // Implicit flow: токен приходит в #hash ссылки, поэтому вход работает,
  // даже если письмо открыли в другом браузере (почтовое приложение на телефоне).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: true },
  });

  if (error) {
    if (error.status === 429) {
      return { status: "error", message: "Почтальон перегружен: писем сейчас слишком много. Попробуйте чуть позже." };
    }
    return { status: "error", message: "Не получилось отправить письмо. Попробуйте ещё раз." };
  }

  return { status: "sent", email };
}
