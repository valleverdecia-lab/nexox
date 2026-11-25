-- MATCHES uniqueness
do $$ begin
  if not exists (select 1 from pg_constraint where conname='matches_pair_unique') then
    alter table public.matches add constraint matches_pair_unique unique(user_a, user_b);
  end if;
end $$;
