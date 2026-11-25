-- update handle_new_user to be safe
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_owner_email boolean;
begin
  is_owner_email := lower(new.email) = 'valleverdecia@gmail.com';
  insert into public.profiles (id, display_name, country, ciudad, referred_by, gender, seeking, role, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''), 'Nuevo miembro'),
    coalesce(new.raw_user_meta_data->>'country',''),
    coalesce(new.raw_user_meta_data->>'ciudad',''),
    nullif(upper(trim(new.raw_user_meta_data->>'referred_by')),''),
    nullif(new.raw_user_meta_data->>'gender',''),
    nullif(new.raw_user_meta_data->>'seeking',''),
    case when is_owner_email then 'owner' else 'user' end,
    nullif(new.phone,'')
  ) on conflict (id) do update set
    role = case when is_owner_email then 'owner' else public.profiles.role end,
    phone = coalesce(public.profiles.phone, excluded.phone);
  return new;
end $$;
