import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Disclaimer } from "@/components/disclaimer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getTopMatches, type ResultCard } from "@/lib/results";
import { getUserContext } from "@/lib/supabase/context";
import { HeroMatch, MatchCard } from "./match-card";

export const metadata: Metadata = { title: "Ваши совпадения — TWIN" };

export default async function ResultsPage() {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");

  const { data: answers } = await ctx.supabase
    .from("answers")
    .select("user_id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (!answers) redirect("/quiz");

  let cards: ResultCard[] = [];
  try {
    cards = await getTopMatches(ctx.supabaseAdmin, ctx.user.id);
  } catch (e) {
    console.error("results failed:", e instanceof Error ? e.message : e);
  }
  const [best, ...rest] = cards;

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader>
        <Button asChild variant="ghost" size="sm">
          <Link href="/profile">Профиль</Link>
        </Button>
      </SiteHeader>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Ваши совпадения</h1>
          <p className="text-lg text-muted-foreground">
            {best ? `Топ-${cards.length} по версии алгоритма TWIN.` : "Алгоритм всё посчитал, но считать пока не с кем."}
          </p>
        </div>

        {best ? (
          <>
            <HeroMatch card={best} />
            {rest.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2">
                {rest.map((card, i) => (
                  <MatchCard key={card.otherId} card={card} rank={i + 2} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed px-6 py-16 text-center">
            <p className="text-6xl">🐞</p>
            <p className="max-w-md text-xl font-semibold">
              Пока в TWIN только вы. Даже в «Жуках» людей больше — позовите друзей.
            </p>
            <p className="max-w-md text-muted-foreground">
              Как только кто-то подходящий пройдёт анкету, он появится здесь.
            </p>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 pt-4">
          <Button asChild variant="ghost">
            <Link href="/quiz?retake=1">Пройти анкету заново</Link>
          </Button>
          <Disclaimer />
        </div>
      </section>
    </main>
  );
}
