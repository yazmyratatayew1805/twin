import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { isExpired, type PairCheck } from "@/lib/pair";
import { getUserContext } from "@/lib/supabase/context";
import { createPairCode } from "./actions";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Проверка пары — TWIN" };

export default async function PairPage({ searchParams }: PageProps<"/pair">) {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");
  const { user, supabaseAdmin: admin } = ctx;

  const [{ data: profile }, { data: answers }] = await Promise.all([
    admin.from("profiles").select("id").eq("id", user.id).maybeSingle(),
    admin.from("answers").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!profile) redirect("/profile");

  const { code, error } = await searchParams;
  const initialCode = typeof code === "string" ? code : undefined;

  if (!answers) {
    return (
      <main className="flex flex-1 flex-col">
        <SiteHeader />
        <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Сначала анкета</h1>
          <p className="text-muted-foreground">
            Каждый из вас проходит её сам, на своём телефоне и не подглядывая. Потом один создаёт
            код, другой его вводит — и алгоритм покажет ваш процент.
          </p>
          <Button asChild size="lg" className="h-12 rounded-full text-base">
            <Link href="/pair/start?then=/quiz">Пройти анкету</Link>
          </Button>
        </section>
      </main>
    );
  }

  const { data: checks } = await admin
    .from("pair_checks")
    .select("*")
    .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .returns<PairCheck[]>();
  const active = checks?.find((c) => c.creator_id === user.id && !c.partner_id && !isExpired(c));
  const done = checks?.filter((c) => c.partner_id) ?? [];

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <section className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight">Проверка пары</h1>
          <p className="text-lg text-muted-foreground">
            Для тех, кто уже нашёл друг друга и хочет узнать, согласен ли с этим алгоритм.
          </p>
          <p className="rounded-2xl bg-accent px-4 py-3 text-sm">
            Это отдельный режим: после создания или ввода кода вас не будет в общей выдаче
            TWIN — и вы не увидите других участников. Только вы двое.
          </p>
        </div>

        {done.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">Ваши результаты</h2>
            {done.map((c) => (
              <Button key={c.code} asChild variant="outline" size="lg" className="h-12 justify-between rounded-2xl">
                <Link href={`/pair/${c.code}`}>
                  <span className="font-heading tracking-widest">{c.code}</span>
                  <span>Открыть →</span>
                </Link>
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6">
          <h2 className="text-xl font-bold">Я первый — нужен код</h2>
          <p className="text-muted-foreground">
            Получите 6 символов и продиктуйте их второй половинке. Код действует 24 часа и
            работает один раз.
          </p>
          {active ? (
            <Button asChild size="lg" className="h-12 rounded-full text-base">
              <Link href={`/pair/${active.code}`}>Мой код: {active.code}</Link>
            </Button>
          ) : (
            <form action={createPairCode}>
              <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base">
                Создать код
              </Button>
            </form>
          )}
          {error === "too-many" && (
            <p role="alert" className="text-sm font-medium text-destructive">
              Слишком много кодов за час. Алгоритму нужна передышка.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6">
          <h2 className="text-xl font-bold">У меня есть код</h2>
          <JoinForm initialCode={initialCode} />
        </div>
      </section>
    </main>
  );
}
