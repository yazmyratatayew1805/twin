-- Rate limiting для входа и запросов к LLM.
-- Счётчики лежат в схеме private (не отдаётся через API), вызываются только с сервера.

create schema if not exists private;

create table private.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         int not null default 0
);

-- Возвращает true, если запрос разрешён, и засчитывает его.
create or replace function public.hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits int;
begin
  insert into private.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
          else r.hits + 1
        end,
        window_start = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
          else r.window_start
        end
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke execute on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
