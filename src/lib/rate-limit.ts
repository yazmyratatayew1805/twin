import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Засчитывает запрос и возвращает true, если лимит не превышен.
 * failOpen: при недоступной БД пропускаем (вход) или блокируем (LLM — бережём бюджет).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  { failOpen }: { failOpen: boolean },
): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) return failOpen;
  return data === true;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
