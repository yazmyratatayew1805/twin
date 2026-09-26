-- TWIN: базовая схема. Все таблицы под RLS.
-- Кросс-пользовательские чтения (ник/возраст совпадений, админка) идут только
-- с сервера через service role, поэтому клиентские политики — «только своё».

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  nickname     text not null check (char_length(nickname) between 2 and 30),
  age          int  not null check (age between 18 and 120),
  gender       text not null check (gender in ('male', 'female')),
  looking_for  text not null check (looking_for in ('male', 'female', 'any')),
  is_admin     boolean not null default false,
  consented_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id and is_admin = false);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Флаг админа клиент менять не может: разрешаем обновлять только анкетные поля.
revoke update on public.profiles from authenticated, anon;
grant update (nickname, age, gender, looking_for) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- answers
-- ---------------------------------------------------------------------------
create table public.answers (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  answers       jsonb not null,
  day_embedding extensions.vector(1536),
  completed_at  timestamptz not null default now()
);

alter table public.answers enable row level security;

create policy "answers: read own" on public.answers
  for select using (auth.uid() = user_id);

-- Запись ответов и эмбеддинга — только сервер (secret key обходит RLS).

-- ---------------------------------------------------------------------------
-- matches (пара хранится один раз: user_a < user_b)
-- ---------------------------------------------------------------------------
create table public.matches (
  user_a      uuid not null references public.profiles (id) on delete cascade,
  user_b      uuid not null references public.profiles (id) on delete cascade,
  score       int  not null check (score between 0 and 100),
  breakdown   jsonb not null,
  red_flags   int  not null default 0,
  explanation text,
  updated_at  timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create index matches_user_b_idx on public.matches (user_b);

alter table public.matches enable row level security;

create policy "matches: read own pairs" on public.matches
  for select using (auth.uid() in (user_a, user_b));

-- ---------------------------------------------------------------------------
-- pair_checks (режим «проверка пары»)
-- ---------------------------------------------------------------------------
create table public.pair_checks (
  code        char(6) primary key,
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  partner_id  uuid references public.profiles (id) on delete cascade,
  score       int check (score between 0 and 100),
  breakdown   jsonb,
  explanation text,
  created_at  timestamptz not null default now()
);

create index pair_checks_creator_idx on public.pair_checks (creator_id);
create index pair_checks_partner_idx on public.pair_checks (partner_id);

alter table public.pair_checks enable row level security;

create policy "pair_checks: read own" on public.pair_checks
  for select using (auth.uid() in (creator_id, partner_id));

-- ---------------------------------------------------------------------------
-- app_settings: дата публикации видео для автоудаления через 30 дней
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id                 boolean primary key default true check (id),
  video_published_at date
);

insert into public.app_settings (id) values (true);

alter table public.app_settings enable row level security;
-- Политик нет: доступ только с сервера.
