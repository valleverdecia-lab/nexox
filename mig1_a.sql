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
