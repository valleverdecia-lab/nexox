-- WHISPERS: add read_at
alter table public.whispers add column if not exists read_at timestamptz;
alter table public.whispers add column if not exists from_name text not null default '';
alter table public.whispers add column if not exists from_lat double precision;
alter table public.whispers add column if not exists from_lng double precision;
