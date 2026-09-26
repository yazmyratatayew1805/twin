import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center">
        <p className="font-heading text-7xl font-bold text-primary">404</p>
        <h1 className="text-2xl font-bold">Здесь никого нет</h1>
        <p className="text-muted-foreground">
          Алгоритм искал эту страницу по всем трём блокам — и не нашёл совпадений.
        </p>
        <Button asChild size="lg" className="h-12 rounded-full text-base">
          <Link href="/">На главную</Link>
        </Button>
      </section>
    </main>
  );
}
