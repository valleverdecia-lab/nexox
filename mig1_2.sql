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
