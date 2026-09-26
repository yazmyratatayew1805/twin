import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { deleted } = await searchParams;

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />

      {deleted && (
        <p className="mx-auto mt-2 rounded-xl bg-accent px-4 py-3 text-center text-sm font-medium">
          Аккаунт и все данные удалены. Спасибо, что заглянули в TWIN.
        </p>
      )}

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
        <p className="rounded-full border px-4 py-1 text-sm text-muted-foreground">
          Тот самый алгоритм из «Жуков». Наконец доделали.
        </p>
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
          TWIN
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
          Анализируем психологию, биоритмы и вкусы, чтобы найти человека, с которым
          вы <span className="font-semibold text-primary">совпадёте</span>. Никакой
          магии — только анкета на 3–5 минут и немного математики.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-14 rounded-full px-8 text-lg">
            <Link href="/login">Найти свою пару</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 rounded-full px-8 text-lg">
            <Link href="/pair/start">Проверить нашу пару</Link>
          </Button>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 px-4 pb-8">
        <Disclaimer />
        <Link href="/privacy" className="text-sm text-muted-foreground underline underline-offset-4">
          Как мы используем данные
        </Link>
      </footer>
    </main>
  );
}
