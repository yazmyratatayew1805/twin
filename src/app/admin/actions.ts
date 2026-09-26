"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { recalculateAll } from "@/lib/matching-service";

export type ActionState = { message?: string; error?: string };

export async function recalculate(): Promise<ActionState> {
  const { supabaseAdmin } = await requireAdmin();
  try {
    const r = await recalculateAll(supabaseAdmin);
    revalidatePath("/admin");
    return { message: `Готово: ${r.participants} участников, ${r.pairs} пар, на флаги проверено ${r.redFlagsChecked}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Пересчёт не удался" };
  }
}

export async function deleteUser(userId: string): Promise<ActionState> {
  const { user, supabaseAdmin } = await requireAdmin();
  if (!z.uuid().safeParse(userId).success) return { error: "Неверный id" };
  if (userId === user.id) return { error: "Себя удалите из профиля — так случайно не выйдет." };
  // Каскадом уходят профиль, ответы, пары и проверки пар.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { message: "Пользователь и все его данные удалены." };
}

export async function setVideoDate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabaseAdmin } = await requireAdmin();
  const raw = String(formData.get("date") ?? "").trim();
  const parsed = z.iso.date().safeParse(raw);
  if (raw && !parsed.success) return { error: "Дата в формате ГГГГ-ММ-ДД" };
  const { error } = await supabaseAdmin
    .from("app_settings")
    .update({ video_published_at: raw || null })
    .eq("id", true);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { message: raw ? "Дата сохранена." : "Автоудаление выключено." };
}
