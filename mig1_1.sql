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
