-- whisper send with limit check
create or replace function public.send_whisper(p_to uuid, p_body text, p_post_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prof record;
  limit_n int;
  wid uuid;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if uid = p_to then raise exception 'cannot_whisper_self'; end if;
  select * into prof from public.profiles where id = uid;
  if prof is null then raise exception 'profile_missing'; end if;
  if prof.is_banned then raise exception 'banned'; end if;
  limit_n := case when public.is_premium(uid) then 5 else 1 end;
  if prof.whispers_reset_at is null or prof.whispers_reset_at < now() then
    update public.profiles set whispers_today = 0, whispers_reset_at = now() + interval '24 hours' where id = uid;
    prof.whispers_today := 0;
  end if;
  if prof.whispers_today >= limit_n then
    raise exception 'whisper_limit';
  end if;
  insert into public.whispers(from_id, to_id, post_id, body, from_name, from_lat, from_lng)
  values (uid, p_to, p_post_id, left(p_body, 800), prof.display_name, prof.lat, prof.lng)
  returning id into wid;
  update public.profiles set whispers_today = whispers_today + 1, last_whisper_at = now(), last_active_at = now() where id = uid;
  insert into public.notifications(user_id, type, title, body, data)
  values (p_to, 'whisper', 'Nuevo susurro', 'Alguien cerca te susurró algo...', jsonb_build_object('whisper_id', wid));
  return wid;
end $$;
