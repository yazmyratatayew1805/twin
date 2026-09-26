# TWIN

Веб-приложение для поиска идеальной пары по мотивам сериала «Жуки». Это развлекательный эксперимент, а не научный сервис знакомств.

Стек: Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui, Supabase (Postgres, Auth, pgvector), Claude Haiku 4.5, OpenAI text-embedding-3-small, Vercel.

## Запуск локально

1. Создайте проект на [supabase.com](https://supabase.com).
2. Примените миграции из `supabase/migrations/` по порядку: Supabase Dashboard → SQL Editor → вставить файл → Run.
3. Скопируйте `.env.example` в `.env.local` и заполните ключи.
4. В Supabase → Authentication → URL Configuration добавьте `http://localhost:3000/**` и адрес продакшена в Redirect URLs.
5. Установите зависимости и запустите:

   ```bash
   npm install
   npm run dev
   ```

## Деплой

Репозиторий подключается к Vercel. Переменные из `.env.example` нужно добавить в Vercel → Project → Settings → Environment Variables. `SUPABASE_SECRET_KEY` используется только на сервере.
