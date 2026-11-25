-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- DAILY QUESTIONS
create table if not exists public.daily_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  active_date date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.daily_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.daily_questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  unique(question_id, user_id)
);

-- BLOCKS / REPORTS
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id)
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

-- EVENT SCHEDULE evolution
alter table public.event_schedule add column if not exists is_active boolean not null default true;
alter table public.event_schedule add column if not exists scheduled_for date;
alter table public.event_schedule add column if not exists banner_text text not null default '';

-- WHISPERS: add read_at
alter table public.whispers add column if not exists read_at timestamptz;
alter table public.whispers add column if not exists from_name text not null default '';
alter table public.whispers add column if not exists from_lat double precision;
alter table public.whispers add column if not exists from_lng double precision;

-- MATCHES uniqueness
do $$ begin
  if not exists (select 1 from pg_constraint where conname='matches_pair_unique') then
    alter table public.matches add constraint matches_pair_unique unique(user_a, user_b);
  end if;
end $$;

-- LIKES pk
do $$ begin
  if not exists (select 1 from pg_constraint where conname='likes_pk') then
    alter table public.likes add constraint likes_pk primary key(from_id, to_id);
  end if;
exception when others then null; end $$;

-- helpful views/functions
create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = auth.uid() and (p.role='owner' or lower(u.email)='valleverdecia@gmail.com')
  )
$$;

create or replace function public.is_premium(u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = u and ((premium_until is not null and premium_until > now()) or role='owner'))
$$;

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

-- received whispers view (anonymous)
create or replace function public.get_received_whispers()
returns table(id uuid, body text, created_at timestamptz, from_name text, distance_km double precision, post_id uuid, read_at timestamptz)
language sql stable security definer set search_path = public as $$
  select w.id, w.body, w.created_at, coalesce(nullif(w.from_name,''),'Alguien'),
    case when w.from_lat is not null and w.from_lng is not null and p.lat is not null and p.lng is not null
      then public.haversine_km(p.lat,p.lng,w.from_lat,w.from_lng) else null end,
    w.post_id, w.read_at
  from public.whispers w
  join public.profiles p on p.id = auth.uid()
  where w.to_id = auth.uid()
  order by w.created_at desc
  limit 100
$$;

-- nearby profiles for modo calenton
create or replace function public.nearby_profiles(p_limit int default 3)
returns table(id uuid, display_name text, avatar_url text, bio text, country text, ciudad text, birth_year int, gender text, distance_km double precision, last_active_at timestamptz, photos jsonb)
language sql stable security definer set search_path = public as $$
  with me as (select * from public.profiles where id = auth.uid())
  select p.id, p.display_name, p.avatar_url, p.bio, p.country, p.ciudad, p.birth_year, p.gender,
    public.haversine_km(me.lat, me.lng, p.lat, p.lng) as distance_km,
    p.last_active_at, p.photos
  from public.profiles p, me
  where me.lat is not null and me.lng is not null
    and p.id <> me.id
    and p.lat is not null and p.lng is not null
    and p.is_banned = false
    and not exists(select 1 from public.blocks b where (b.blocker_id=me.id and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=me.id))
  order by distance_km asc
  limit greatest(1, least(p_limit, 20))
$$;

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
