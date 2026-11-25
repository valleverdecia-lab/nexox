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
