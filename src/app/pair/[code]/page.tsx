import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import type { Answers } from "@/config/questions";
import { generateExplanations } from "@/lib/ai/explanations";
import { pairHighlights } from "@/lib/matching";
import {
  expiresAt,
  isExpired,
  isValidCodeFormat,
  normalizeCode,
  pairFallbackExplanation,
  type PairCheck,
} from "@/lib/pair";
import { rateLimit } from "@/lib/rate-limit";
import { getUserContext } from "@/lib/supabase/context";
import { Reveal } from "./reveal";
import { Waiting } from "./waiting";

export const metadata: Metadata = { title: "Результат пары — TWIN" };

export default async function PairResultPage({ params }: PageProps<"/pair/[code]">) {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");
  const { user, supabaseAdmin: admin } = ctx;

  const code = normalizeCode((await params).code);
  if (!isValidCodeFormat(code)) notFound();

  const { data: check } = await admin
    .from("pair_checks")
    .select("*")
    .eq("code", code)
    .maybeSingle<PairCheck>();
  const member = check && (check.creator_id === user.id || check.partner_id === user.id);

  // Чужой код: предлагаем ввести его (если он ещё свободен), ничего не раскрывая.
  if (!check || !member) {
    if (check && !check.partner_id && !isExpired(check)) redirect(`/pair?code=${code}`);
    notFound();
  }

  let body: React.ReactNode;
  if (!check.partner_id || check.score === null || !check.breakdown) {
    body = isExpired(check) ? (
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-bold">Код просрочен</h1>
        <p className="text-muted-foreground">Он жил 24 часа. Создайте новый в разделе «Проверка пары».</p>
      </div>
    ) : (
      <Waiting code={check.code} expiresAt={expiresAt(check).toISOString()} />
    );
  } else {
    const partnerId = check.partner_id;
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nickname")
      .in("id", [check.creator_id, partnerId]);
    const nick = (id: string) => profiles?.find((p) => p.id === id)?.nickname ?? "?";

    // Объяснение кешируется в pair_checks; если ИИ тогда не ответил — пробуем ещё раз, иначе шаблон.
    let explanation = check.explanation;
    if (!explanation && (await rateLimit(`explain:${user.id}`, 10, 3600, { failOpen: false }))) {
      const { data: rows } = await admin
        .from("answers")
        .select("user_id, answers")
        .in("user_id", [check.creator_id, partnerId]);
      const a = rows?.find((r) => r.user_id === check.creator_id)?.answers as Answers | undefined;
      const b = rows?.find((r) => r.user_id === partnerId)?.answers as Answers | undefined;
      if (a && b) {
        const [text] = await generateExplanations([
          { score: check.score, breakdown: check.breakdown, ...pairHighlights(a, b) },
        ]);
        if (text) {
          explanation = text;
          await admin.from("pair_checks").update({ explanation: text }).eq("code", check.code);
        }
      }
    }

    body = (
      <Reveal
        names={[nick(check.creator_id), nick(partnerId)]}
        score={check.score}
        breakdown={check.breakdown}
        explanation={explanation ?? (await pairFallbackExplanation(admin, check))}
      />
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-10">
        {body}
      </section>
    </main>
  );
}
