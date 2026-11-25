-- admin grant premium
create or replace function public.admin_grant_premium(target uuid, days int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  update public.profiles
  set premium_until = greatest(coalesce(premium_until, now()), now()) + (greatest(days,1) || ' days')::interval
  where id = target;
end $$;

create or replace function public.admin_revoke_premium(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  update public.profiles set premium_until = null where id = target;
end $$;

create or replace function public.admin_ban(target uuid, reason text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  update public.profiles set is_banned = true, ban_reason = reason where id = target;
end $$;

create or replace function public.admin_unban(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  update public.profiles set is_banned = false, ban_reason = '' where id = target;
end $$;
