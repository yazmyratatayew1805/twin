import "server-only";
import { createClient } from "@supabase/supabase-js";

// Secret key обходит RLS. Импортировать только в серверном коде.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
