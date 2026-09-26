import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/profile";
import { getUserContext } from "@/lib/supabase/context";
import { signOut } from "./actions";
import { DeleteAccount } from "./delete-account";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Профиль — TWIN" };

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");

  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("*")
    .eq("id", ctx.user.id)
    .maybeSingle<Profile>();

  const { saved } = await searchParams;

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">Выйти</Button>
        </form>
      </SiteHeader>

      <section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {profile ? "Ваш профиль" : "Пара слов о себе"}
          </h1>
          <p className="text-muted-foreground">
            {profile
              ? "Можно поправить, если алгоритм понял вас неправильно."
              : "Четыре поля — и переходим к анкете. Алгоритму нужно знать, кого вам искать."}
          </p>
        </div>

        {saved && (
          <p className="rounded-xl bg-accent px-4 py-3 text-sm font-medium">Сохранили ✓</p>
        )}

        <ProfileForm profile={profile} />

        {profile && (
          <Button asChild variant="secondary" size="lg" className="h-12 rounded-full text-base">
            <Link href="/quiz">К анкете</Link>
          </Button>
        )}

        <div className="flex flex-col gap-3 border-t pt-8">
          <p className="text-sm text-muted-foreground">
            Вошли как {ctx.user.email}. Этот адрес видите только вы.
          </p>
          <DeleteAccount />
        </div>
      </section>
    </main>
  );
}
