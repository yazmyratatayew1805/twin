import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getUserContext } from "@/lib/supabase/context";

// Заглушка: расчёт и результаты появятся на этапах 4–5.
export default async function ResultsPage() {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <section className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-3xl font-bold">Ответы сохранены</h1>
        <p className="text-muted-foreground">Расчёт совместимости появится на следующих этапах.</p>
      </section>
    </main>
  );
}
