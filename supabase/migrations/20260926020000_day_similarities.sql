-- Косинусное сходство эмбеддингов «идеального дня» считается в Postgres (pgvector),
-- чтобы не тащить векторы по 1536 чисел в приложение. Вызывается только с сервера.

create or replace function public.day_similarities(p_user uuid)
returns table (user_id uuid, similarity float8)
language sql
stable
security definer
set search_path = ''
as $$
  select b.user_id,
         1 - (a.day_embedding operator(extensions.<=>) b.day_embedding) as similarity
  from public.answers a
  join public.answers b on b.user_id <> a.user_id
  where a.user_id = p_user
    and a.day_embedding is not null
    and b.day_embedding is not null
$$;

revoke execute on function public.day_similarities(uuid) from public, anon, authenticated;
grant execute on function public.day_similarities(uuid) to service_role;
