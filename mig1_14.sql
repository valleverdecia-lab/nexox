-- MESSAGES: ensure sequence/default
create sequence if not exists public.messages_id_seq;
alter table public.messages alter column id set default nextval('public.messages_id_seq');
select setval('public.messages_id_seq', coalesce((select max(id) from public.messages), 0) + 1, false);
