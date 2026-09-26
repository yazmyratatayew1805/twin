# TWIN

Веб-приложение для поиска идеальной пары по мотивам сериала «Жуки». Это развлекательный эксперимент, а не научный сервис знакомств.

Стек: Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui, Supabase (Postgres, Auth, pgvector, pg_cron), Google Gemini (бесплатный тариф: объяснения, красные флаги, эмбеддинги), Vercel.

## Запуск локально

1. Создайте проект на [supabase.com](https://supabase.com).
2. Скопируйте `.env.example` в `.env.local` и заполните ключи.
3. Примените миграции из `supabase/migrations/`:

   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

4. В Supabase → Authentication → URL Configuration добавьте `http://localhost:3000/**` и адрес продакшена в Redirect URLs.
5. Установите зависимости и запустите:

   ```bash
   npm install
   npm run dev
   ```

## Скрипты

| Команда | Что делает |
|---|---|
| `npm test` | юнит-тесты: алгоритм совместимости, анкета, объяснения, коды пар |
| `npm run seed` | пересоздаёт 10 вымышленных участников и пересчитывает все пары |
| `npm run seed -- --reset` | удаляет только seed-участников |
| `npm run embeddings:backfill` | досчитывает эмбеддинги «идеального дня», где их нет |

## Как устроено

- **Анкета** — `src/config/questions.ts`, формулировки меняются без правки логики.
- **Алгоритм** — `src/lib/matching.ts` (чистые функции с тестами): 45% психология, 25% образ жизни, 30% вкусы, минус 15 за красный флаг.
- **Проверка пары** — `/pair`: код из 6 символов на 24 часа, одноразовый. Кто создал или ввёл код, выходит из общей выдачи: его не видят другие, и он не видит других.
- **Админка** — `/admin`, только для профилей с `is_admin = true`. Назначить админа:

  ```sql
  update public.profiles set is_admin = true
  where id = (select id from auth.users where email = 'you@example.com');
  ```

- **Автоудаление** — в админке задаётся дата публикации видео; через 30 дней pg_cron (ежедневно в 03:00 UTC) удаляет всех участников, кроме админов.

## Деплой

Репозиторий подключается к Vercel. Переменные из `.env.example` (кроме `SUPABASE_ACCESS_TOKEN` и `SUPABASE_DB_PASSWORD`) нужно добавить в Vercel → Project → Settings → Environment Variables. `SUPABASE_SECRET_KEY` и `GEMINI_API_KEY` используются только на сервере.

## Перед публикацией видео

- [ ] `npm run seed -- --reset` — убрать вымышленных участников.
- [ ] Адрес Vercel добавлен в Supabase → Authentication → Redirect URLs.
- [ ] Свой SMTP в Supabase (встроенная почта — 2 письма в час на весь проект).
- [ ] Перевыпущены ключи, которые где-либо светились (Supabase secret, access token, пароль БД, Gemini).
- [ ] В админке задана дата публикации видео.
