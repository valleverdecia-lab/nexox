-- EVENT SCHEDULE evolution
alter table public.event_schedule add column if not exists is_active boolean not null default true;
alter table public.event_schedule add column if not exists scheduled_for date;
alter table public.event_schedule add column if not exists banner_text text not null default '';
