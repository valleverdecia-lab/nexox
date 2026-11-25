-- LIKES pk
do $$ begin
  if not exists (select 1 from pg_constraint where conname='likes_pk') then
    alter table public.likes add constraint likes_pk primary key(from_id, to_id);
  end if;
exception when others then null; end $$;
