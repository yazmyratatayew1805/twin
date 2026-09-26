import "server-only";
import type { SupabaseEnv, UserClaims } from "@supabase/server";
import { createContextClient, verifyCredentials } from "@supabase/server/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { createAdminClient } from "./admin";
import { resolveNextEnv } from "./env";
import { createClient } from "./server";

export type UserContext = {
  user: UserClaims;
  /** Клиент от имени пользователя, работает под RLS. */
  supabase: SupabaseClient;
  /** Клиент с secret key, обходит RLS. */
  supabaseAdmin: SupabaseClient;
};

let cachedJwks: SupabaseEnv["jwks"] = null;

async function getJwks(supabaseUrl: string): Promise<SupabaseEnv["jwks"]> {
  if (cachedJwks) return cachedJwks;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    if (!res.ok) return null;
    cachedJwks = await res.json();
    return cachedJwks;
  } catch {
    return null;
  }
}

// Сессию читает @supabase/ssr (proxy её уже обновил), JWT проверяет
// @supabase/server по JWKS. Возвращает null, если пользователь не вошёл.
export const getUserContext = cache(async (): Promise<UserContext | null> => {
  const env = resolveNextEnv();
  const ssrClient = await createClient();
  const {
    data: { session },
  } = await ssrClient.auth.getSession();
  if (!session) return null;

  const jwks = await getJwks(env.url!);
  const { data: auth, error } = await verifyCredentials(
    { token: session.access_token, apikey: null },
    { auth: "user", env: { ...env, jwks } },
  );
  if (error || !auth.userClaims) return null;

  return {
    user: auth.userClaims,
    supabase: createContextClient({ auth: { token: auth.token }, env }),
    supabaseAdmin: createAdminClient(),
  };
});
