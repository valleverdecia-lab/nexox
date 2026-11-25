-- helpful views/functions
create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = auth.uid() and (p.role='owner' or lower(u.email)='valleverdecia@gmail.com')
  )
$$;

create or replace function public.is_premium(u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = u and ((premium_until is not null and premium_until > now()) or role='owner'))
$$;
