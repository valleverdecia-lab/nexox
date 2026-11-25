-- cleanup functions
create or replace function public.cleanup_daily()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- delete posts/comments older than 24h (board cleanup)
  delete from public.comments where created_at < now() - interval '24 hours';
  delete from public.posts where created_at < now() - interval '24 hours';
  -- delete old whispers/messages older than 24h to save space (per spec)
  delete from public.messages where created_at < now() - interval '24 hours';
  delete from public.whispers where created_at < now() - interval '24 hours';
  delete from public.notifications where created_at < now() - interval '7 days';
end $$;

create or replace function public.cleanup_inactive_users()
returns int language plpgsql security definer set search_path = public as $$
declare
  deleted_count int;
begin
  with doomed as (
    select id from public.profiles
    where role <> 'owner'
      and created_at < now() - interval '7 days'
      and last_match_at is null
      and last_whisper_at is null
  )
  delete from auth.users u using doomed d where u.id = d.id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end $$;;
