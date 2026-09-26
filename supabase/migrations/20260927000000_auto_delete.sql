-- Автоудаление: через 30 дней после публикации видео (дату задаёт админ в app_settings)
-- удаляются все участники, кроме админов. Каскадом уходят профили, ответы, пары и проверки пар.
-- Проверка раз в сутки через pg_cron — отдельный сервис или cron на Vercel не нужен.

create extension if not exists pg_cron;

create or replace function private.auto_delete_after_video()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_published date;
  v_deleted integer;
begin
  select video_published_at into v_published from public.app_settings where id;
  if v_published is null or now() < v_published + interval '30 days' then
    return 0;
  end if;

  delete from auth.users u
  where not exists (select 1 from public.profiles p where p.id = u.id and p.is_admin);
  get diagnostics v_deleted = row_count;

  delete from private.rate_limits;
  return v_deleted;
end;
$$;

revoke execute on function private.auto_delete_after_video() from public;

select cron.schedule('twin-auto-delete', '0 3 * * *', $$select private.auto_delete_after_video()$$);
