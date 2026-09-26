import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getUserContext } from "@/lib/supabase/context";
import { Calculating } from "./calculating";

export const metadata: Metadata = { title: "Алгоритм анализирует… — TWIN" };

export default async function CalculatingPage() {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <section className="flex flex-1 items-center justify-center px-4 py-12">
        <Calculating />
      </section>
    </main>
  );
}
