import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const body = z.union([
  z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1) }),
  z.object({ token_hash: z.string().min(1) }),
  z.object({ code: z.string().min(1) }),
]);

// Принимает данные из ссылки письма и ставит сессионные куки на сервере.
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createClient();
  const data = parsed.data;
  const { error } =
    "access_token" in data
      ? await supabase.auth.setSession(data)
      : "token_hash" in data
        ? await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "email" })
        : await supabase.auth.exchangeCodeForSession(data.code);

  if (error) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true });
}
