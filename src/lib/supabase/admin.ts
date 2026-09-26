import "server-only";
import { createAdminClient as createSupabaseAdminClient } from "@supabase/server/core";
import { resolveNextEnv } from "./env";

// Secret key обходит RLS. Импортировать только в серверном коде.
export function createAdminClient() {
  return createSupabaseAdminClient({ env: resolveNextEnv() });
}
