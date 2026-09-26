import "server-only";
import { notFound } from "next/navigation";
import type { Breakdown } from "@/lib/matching";
import { histogram } from "@/lib/histogram";
import { pairModeUserIds } from "@/lib/pair";
import { getUserContext } from "@/lib/supabase/context";

export type { Bucket } from "@/lib/histogram";

/** Только для профиля с is_admin. Остальным — 404, чтобы не раскрывать, что страница есть. */
export async function requireAdmin() {
  const ctx = await getUserContext();
  if (!ctx) notFound();
  const { data: profile } = await ctx.supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", ctx.user.id)
    .maybeSingle();
  if (!profile?.is_admin) notFound();
  return ctx;
}

const PAGE = 1000;

export async function loadAdminData(admin: Awaited<ReturnType<typeof requireAdmin>>["supabaseAdmin"]) {
  const scores: number[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin.from("matches").select("score").range(from, from + PAGE - 1);
    if (error) throw new Error(`admin scores: ${error.message}`);
    scores.push(...data.map((r) => r.score));
    if (data.length < PAGE) break;
  }

  const [profiles, answers, topPairs, checks, settings, pairMode] = await Promise.all([
    admin
      .from("profiles")
      .select("id, nickname, age, gender, looking_for, is_admin, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
    admin.from("answers").select("user_id"),
    admin
      .from("matches")
      .select("user_a, user_b, score, breakdown, red_flags")
      .order("score", { ascending: false })
      .limit(30),
    admin.from("pair_checks").select("code", { count: "exact", head: true }).not("partner_id", "is", null),
    admin.from("app_settings").select("video_published_at").eq("id", true).maybeSingle(),
    pairModeUserIds(admin),
  ]);

  const people = profiles.data ?? [];
  const answered = new Set((answers.data ?? []).map((a) => a.user_id));
  const nick = new Map(people.map((p) => [p.id, p.nickname]));

  return {
    stats: {
      participants: people.length,
      answered: answered.size,
      pairs: scores.length,
      pairChecks: checks.count ?? 0,
    },
    buckets: histogram(scores),
    median: scores.length ? [...scores].sort((a, b) => a - b)[Math.floor(scores.length / 2)] : null,
    topPairs: (topPairs.data ?? []).map((m) => ({
      key: `${m.user_a}|${m.user_b}`,
      a: nick.get(m.user_a) ?? "?",
      b: nick.get(m.user_b) ?? "?",
      score: m.score as number,
      breakdown: m.breakdown as Breakdown,
      redFlags: m.red_flags as number,
    })),
    people: people.map((p) => ({ ...p, answered: answered.has(p.id), pairMode: pairMode.has(p.id) })),
    videoPublishedAt: (settings.data?.video_published_at as string | null) ?? null,
  };
}
