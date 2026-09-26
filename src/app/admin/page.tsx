import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { loadAdminData, requireAdmin } from "@/lib/admin";
import { GENDERS, LOOKING_FOR } from "@/lib/profile";
import { DeleteUserButton, RecalculateButton, VideoDateForm } from "./controls";
import { Histogram, plural } from "./histogram";

export const metadata: Metadata = { title: "Админка — TWIN", robots: { index: false } };
// «Пересчитать всё» на сотнях участников может идти дольше стандартного лимита.
export const maxDuration = 300;

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-heading text-3xl font-bold tabular-nums">{value.toLocaleString("ru-RU")}</span>
    </div>
  );
}

export default async function AdminPage() {
  const { user, supabaseAdmin } = await requireAdmin();
  const data = await loadAdminData(supabaseAdmin);

  const deleteOn = data.videoPublishedAt
    ? new Date(new Date(data.videoPublishedAt).getTime() + 30 * 86400_000).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6">
        <h1 className="text-4xl font-bold tracking-tight">Админка</h1>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Участников" value={data.stats.participants} />
          <StatTile label="Прошли анкету" value={data.stats.answered} />
          <StatTile label="Пар в выдаче" value={data.stats.pairs} />
          <StatTile label="Проверок пары" value={data.stats.pairChecks} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-3 rounded-3xl border bg-card p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-bold">Распределение процентов</h2>
              {data.median !== null && (
                <span className="text-sm text-muted-foreground">медиана {data.median}%</span>
              )}
            </div>
            {data.stats.pairs ? (
              <Histogram buckets={data.buckets} />
            ) : (
              <p className="py-10 text-center text-muted-foreground">
                Пар пока нет. Даже в «Жуках» людей больше — позовите друзей.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-6 rounded-3xl border bg-card p-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold">Пересчёт</h2>
              <p className="text-sm text-muted-foreground">
                Заново считает совместимость всех со всеми и сбрасывает объяснения.
              </p>
              <RecalculateButton />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold">Автоудаление</h2>
              <p className="text-sm text-muted-foreground">
                Дата публикации видео. Через 30 дней после неё все данные участников (кроме админов)
                удалятся автоматически.
              </p>
              <VideoDateForm value={data.videoPublishedAt} />
              {deleteOn && <p className="text-sm font-medium">Данные удалятся {deleteOn}</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border bg-card p-6">
          <h2 className="text-xl font-bold">Лучшие пары</h2>
          {data.topPairs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm tabular-nums">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">Пара</th>
                    <th className="py-2 text-right font-medium">Итог</th>
                    <th className="py-2 text-right font-medium">Психология</th>
                    <th className="py-2 text-right font-medium">Образ жизни</th>
                    <th className="py-2 text-right font-medium">Вкусы</th>
                    <th className="py-2 text-right font-medium">Флаги</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPairs.map((p) => (
                    <tr key={p.key} className="border-t">
                      <td className="py-2 font-medium">
                        {p.a} + {p.b}
                      </td>
                      <td className="py-2 text-right font-bold">{p.score}%</td>
                      <td className="py-2 text-right">{p.breakdown.psychology}%</td>
                      <td className="py-2 text-right">{p.breakdown.lifestyle}%</td>
                      <td className="py-2 text-right">{p.breakdown.tastes}%</td>
                      <td className="py-2 text-right">{p.redFlags ? `🚩 ${p.redFlags}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">Пока пусто.</p>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border bg-card p-6">
          <h2 className="text-xl font-bold">
            Участники{" "}
            <span className="text-base font-normal text-muted-foreground">
              · {data.people.length} {plural(data.people.length, ["человек", "человека", "человек"])}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">Email и ответы анкеты здесь не показываются — их видит только сам участник.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Ник</th>
                  <th className="py-2 font-medium">Возраст</th>
                  <th className="py-2 font-medium">Пол → ищет</th>
                  <th className="py-2 font-medium">Статус</th>
                  <th className="py-2 font-medium">С нами с</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {data.people.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 font-medium">
                      {p.nickname}
                      {p.is_admin && <span className="ml-2 text-xs text-primary">админ</span>}
                    </td>
                    <td className="py-2 tabular-nums">{p.age}</td>
                    <td className="py-2">
                      {GENDERS[p.gender as keyof typeof GENDERS]} → {LOOKING_FOR[p.looking_for as keyof typeof LOOKING_FOR].toLowerCase()}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {p.pairMode ? "проверка пары" : p.answered ? "анкета пройдена" : "без анкеты"}
                    </td>
                    <td className="py-2 text-muted-foreground tabular-nums">
                      {new Date(p.created_at).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="py-2 text-right">
                      {p.id !== user.id && <DeleteUserButton userId={p.id} nickname={p.nickname} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
