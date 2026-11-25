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
