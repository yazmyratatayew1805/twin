import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Только 18+ — TWIN" };

export default function BlockedPage() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-6xl">🚜</p>
        <h1 className="text-3xl font-bold tracking-tight">TWIN — только для 18+</h1>
        <p className="text-muted-foreground">
          Алгоритм пока работает только со взрослыми. Мы не сохранили ни одного вашего
          ответа — аккаунт удалён. Возвращайтесь, когда стукнет 18.
        </p>
      </section>
    </main>
  );
}
