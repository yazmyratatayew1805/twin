import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getUserContext } from "@/lib/supabase/context";

// Заглушка: анкета появится на этапе 3.
export default async function QuizPage() {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");

  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("id")
    .eq("id", ctx.user.id)
    .maybeSingle();
  if (!profile) redirect("/profile");

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <section className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-3xl font-bold">Анкета скоро</h1>
        <p className="text-muted-foreground">Профиль сохранён. Вопросы появятся на следующем этапе.</p>
      </section>
    </main>
  );
}
