import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { UNDERAGE_COOKIE } from "@/lib/profile";
import { getUserContext } from "@/lib/supabase/context";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход — TWIN" };

export default async function LoginPage() {
  if ((await cookies()).get(UNDERAGE_COOKIE)) redirect("/blocked");
  if (await getUserContext()) redirect("/profile");

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Вход</h1>
          <p className="text-muted-foreground">
            Паролей нет — пришлём ссылку на почту. Как в стартапе, только без инвесторов.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
