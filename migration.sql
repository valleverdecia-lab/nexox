
-- Palacalle schema evolution
create extension if not exists pgcrypto;

-- PROFILES evolution
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists photos jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists ban_reason text not null default '';
alter table public.profiles add column if not exists whispers_today int not null default 0;
alter table public.profiles add column if not exists whispers_reset_at timestamptz;
alter table public.profiles add column if not exists location_updated_at timestamptz;
alter table public.profiles add column if not exists last_active_at timestamptz not null default now();
alter table public.profiles add column if not exists onboarding_done boolean not null default false;
alter table public.profiles add column if not exists is_online boolean not null default false;
alter table public.profiles add column if not exists dob date;
alter table public.profiles add column if not exists looking_for text not null default 'cubanos';
alter table public.profiles add column if not exists ig_handle text not null default '';
alter table public.profiles add column if not exists verified boolean not null default false;

create index if not exists profiles_last_active_idx on public.profiles(last_active_at desc);
create index if not exists profiles_location_idx on public.profiles(lat, lng);
create index if not exists profiles_premium_idx on public.profiles(premium_until);
create index if not exists profiles_referred_by_idx on public.profiles(referred_by);

-- OWNER enforcement: only valleverdecia@gmail.com gets owner role
create or replace function public.enforce_owner_role()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uemail text;
begin
  select email into uemail from auth.users where id = new.id;
  if lower(uemail) = 'valleverdecia@gmail.com' then
    new.role := 'owner';
  else
    if new.role = 'owner' then
      new.role := 'user';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_owner_role on public.profiles;
create trigger trg_enforce_owner_role
before insert or update on public.profiles
for each row execute function public.enforce_owner_role();

-- update handle_new_user to be safe
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_owner_email boolean;
begin
  is_owner_email := lower(new.email) = 'valleverdecia@gmail.com';
  insert into public.profiles (id, display_name, country, ciudad, referred_by, gender, seeking, role, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''), 'Nuevo miembro'),
    coalesce(new.raw_user_meta_data->>'country',''),
    coalesce(new.raw_user_meta_data->>'ciudad',''),
    nullif(upper(trim(new.raw_user_meta_data->>'referred_by')),''),
    nullif(new.raw_user_meta_data->>'gender',''),
    nullif(new.raw_user_meta_data->>'seeking',''),
    case when is_owner_email then 'owner' else 'user' end,
    nullif(new.phone,'')
  ) on conflict (id) do update set
    role = case when is_owner_email then 'owner' else public.profiles.role end,
    phone = coalesce(public.profiles.phone, excluded.phone);
  return new;
end $$;

-- ensure trigger exists on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- AFFILIATES
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.affiliate_hits (
  id uuid primary key default gen_random_uuid(),
  affiliate_code text not null references public.affiliates(code) on delete cascade,
  visitor_fp text,
  created_at timestamptz not null default now()
);
create table if not exists public.affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  affiliate_code text not null references public.affiliates(code) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  amount_cup int not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists affiliate_hits_code_idx on public.affiliate_hits(affiliate_code);
create index if not exists affiliate_conv_code_idx on public.affiliate_conversions(affiliate_code);

-- GROUPS (OF mode)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  cover_url text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(group_id, user_id)
);
create table if not exists public.group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  media_url text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists group_posts_group_idx on public.group_posts(group_id, created_at desc);

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

-- MESSAGES: ensure sequence/default
create sequence if not exists public.messages_id_seq;
alter table public.messages alter column id set default nextval('public.messages_id_seq');
select setval('public.messages_id_seq', coalesce((select max(id) from public.messages), 0) + 1, false);

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
end $$;


-- RLS ENABLE
alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.whispers enable row level security;
alter table public.events enable row level security;
alter table public.event_schedule enable row level security;
alter table public.affiliates enable row level security;
alter table public.affiliate_hits enable row level security;
alter table public.affiliate_conversions enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_posts enable row level security;
alter table public.notifications enable row level security;
alter table public.daily_questions enable row level security;
alter table public.daily_answers enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- drop existing policies if any (idempotent-ish)
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- PROFILES
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_owner())
  with check (id = auth.uid() or public.is_owner());
create policy profiles_delete_owner on public.profiles for delete to authenticated using (public.is_owner() or id = auth.uid());

-- LIKES
create policy likes_select on public.likes for select to authenticated using (from_id = auth.uid() or to_id = auth.uid() or public.is_owner());
create policy likes_insert on public.likes for insert to authenticated with check (from_id = auth.uid());
create policy likes_delete on public.likes for delete to authenticated using (from_id = auth.uid() or public.is_owner());

-- MATCHES
create policy matches_select on public.matches for select to authenticated using (user_a = auth.uid() or user_b = auth.uid() or public.is_owner());
create policy matches_insert on public.matches for insert to authenticated with check (user_a = auth.uid() or user_b = auth.uid() or public.is_owner());

-- MESSAGES
create policy messages_select on public.messages for select to authenticated
  using (public.is_owner() or exists(select 1 from public.matches m where m.id = match_id and (m.user_a=auth.uid() or m.user_b=auth.uid())));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and exists(select 1 from public.matches m where m.id = match_id and (m.user_a=auth.uid() or m.user_b=auth.uid())));

-- POSTS / COMMENTS (La Calle)
create policy posts_select on public.posts for select to authenticated using (true);
create policy posts_insert on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy posts_delete on public.posts for delete to authenticated using (author_id = auth.uid() or public.is_owner());
create policy comments_select on public.comments for select to authenticated using (true);
create policy comments_insert on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated using (author_id = auth.uid() or public.is_owner());

-- WHISPERS: direct table access restricted; use RPCs. Owner can read all.
create policy whispers_select_owner on public.whispers for select to authenticated using (public.is_owner() or from_id = auth.uid());
create policy whispers_insert_none on public.whispers for insert to authenticated with check (false);
create policy whispers_update_owner on public.whispers for update to authenticated using (public.is_owner() or to_id = auth.uid());

-- EVENTS
create policy events_select on public.events for select to authenticated using (true);
create policy events_write_owner on public.events for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy event_schedule_select on public.event_schedule for select to authenticated using (true);
create policy event_schedule_write_owner on public.event_schedule for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- AFFILIATES: owner only
create policy affiliates_owner on public.affiliates for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy affiliate_hits_owner_sel on public.affiliate_hits for select to authenticated using (public.is_owner());
create policy affiliate_hits_insert_any on public.affiliate_hits for insert to anon, authenticated with check (true);
create policy affiliate_conv_owner on public.affiliate_conversions for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- GROUPS
create policy groups_select on public.groups for select to authenticated using (true);
create policy groups_insert on public.groups for insert to authenticated with check (owner_id = auth.uid());
create policy groups_update on public.groups for update to authenticated using (owner_id = auth.uid() or public.is_owner());
create policy groups_delete on public.groups for delete to authenticated using (owner_id = auth.uid() or public.is_owner());
create policy group_members_select on public.group_members for select to authenticated using (true);
create policy group_members_insert on public.group_members for insert to authenticated with check (user_id = auth.uid());
create policy group_members_delete on public.group_members for delete to authenticated using (user_id = auth.uid() or public.is_owner() or exists(select 1 from public.groups g where g.id=group_id and g.owner_id=auth.uid()));
create policy group_posts_select on public.group_posts for select to authenticated using (true);
create policy group_posts_insert on public.group_posts for insert to authenticated with check (author_id = auth.uid() and exists(select 1 from public.group_members gm where gm.group_id=group_posts.group_id and gm.user_id=auth.uid()));
create policy group_posts_delete on public.group_posts for delete to authenticated using (author_id = auth.uid() or public.is_owner());

-- NOTIFICATIONS
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid() or public.is_owner());
create policy notifications_update on public.notifications for update to authenticated using (user_id = auth.uid());
create policy notifications_insert_owner on public.notifications for insert to authenticated with check (public.is_owner() or user_id = auth.uid());

-- DAILY QUESTIONS
create policy daily_questions_select on public.daily_questions for select to authenticated using (true);
create policy daily_questions_write on public.daily_questions for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy daily_answers_select on public.daily_answers for select to authenticated using (true);
create policy daily_answers_insert on public.daily_answers for insert to authenticated with check (user_id = auth.uid());
create policy daily_answers_update on public.daily_answers for update to authenticated using (user_id = auth.uid());

-- BLOCKS/REPORTS
create policy blocks_select on public.blocks for select to authenticated using (blocker_id = auth.uid() or public.is_owner());
create policy blocks_insert on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated using (blocker_id = auth.uid());
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_select_owner on public.reports for select to authenticated using (public.is_owner());
