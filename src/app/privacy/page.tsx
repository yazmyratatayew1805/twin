import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Как мы используем данные — TWIN" };

const sections = [
  {
    title: "Что мы собираем",
    text: "Email для входа, ник, возраст, пол, кого вы ищете и ответы анкеты: про характер, ценности, режим дня и вкусы, плюс два коротких свободных ответа.",
  },
  {
    title: "Зачем",
    text: "Только чтобы посчитать совместимость с другими участниками и показать результат. Никакой рекламы, продажи данных или рассылок.",
  },
  {
    title: "Кто что видит",
    text: "Другие участники видят только ваш ник, возраст, процент совпадения и короткое объяснение. Ваш email и ответы анкеты не видит никто, кроме вас.",
  },
  {
    title: "Где хранится",
    text: "В базе данных Supabase (сервер в Европе). Доступ к чужим ответам закрыт на уровне базы.",
  },
  {
    title: "Искусственный интеллект",
    text: "Текст «идеального дня» отправляется в OpenAI, чтобы превратить его в набор чисел для сравнения. Чтобы написать объяснение пары и проверить «неприемлемое», мы отправляем в Claude (Anthropic) сводку совпадений и нужные для проверки ответы — без email и без имени.",
  },
  {
    title: "Удаление",
    text: "В профиле есть кнопка «Удалить мой аккаунт и все данные» — всё стирается сразу и полностью. А через 30 дней после выхода видео мы удалим данные всех участников.",
  },
  {
    title: "Важно",
    text: "TWIN — развлекательный эксперимент по мотивам сериала «Жуки». Результат не является научной или психологической оценкой. Сервис только для тех, кому исполнилось 18.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Как мы используем данные</h1>
        <p className="text-lg text-muted-foreground">Коротко и без юридического тумана.</p>
        {sections.map((s) => (
          <section key={s.title} className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">{s.title}</h2>
            <p className="leading-relaxed text-muted-foreground">{s.text}</p>
          </section>
        ))}
      </article>
    </main>
  );
}
