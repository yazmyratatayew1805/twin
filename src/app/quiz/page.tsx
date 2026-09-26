import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getUserContext } from "@/lib/supabase/context";
import { Quiz } from "./quiz";

export const metadata: Metadata = { title: "Анкета — TWIN" };

export default async function QuizPage({ searchParams }: PageProps<"/quiz">) {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");

  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("id")
    .eq("id", ctx.user.id)
    .maybeSingle();
  if (!profile) redirect("/profile");

  const { retake } = await searchParams;
  const { data: done } = await ctx.supabase
    .from("answers")
    .select("user_id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (done && !retake) {
    return (
      <main className="flex flex-1 flex-col">
        <SiteHeader />
        <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Анкета уже пройдена</h1>
          <p className="text-muted-foreground">
            Алгоритм вас запомнил. Можно посмотреть совпадения или пройти анкету заново —
            старые ответы заменятся новыми.
          </p>
          <Button asChild size="lg" className="h-12 rounded-full text-base">
            <Link href="/results">К результатам</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-12 rounded-full text-base">
            <Link href="/quiz?retake=1">Пройти заново</Link>
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <Quiz userId={ctx.user.id} />
    </main>
  );
}
