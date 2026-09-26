import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <span className="font-heading text-xl font-bold tracking-tight">TWIN</span>
        <ThemeToggle />
      </header>

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
        <Button asChild size="lg" className="h-14 rounded-full px-8 text-lg">
          <Link href="/login">Найти свою пару</Link>
        </Button>
      </section>

      <footer className="mx-auto w-full max-w-3xl px-4 pb-8 text-center text-sm text-muted-foreground">
        Это развлекательный эксперимент. Результат не является научной или
        психологической оценкой.
      </footer>
    </main>
  );
}
