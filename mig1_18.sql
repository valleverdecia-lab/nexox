-- nearby profiles for modo calenton
create or replace function public.nearby_profiles(p_limit int default 3)
returns table(id uuid, display_name text, avatar_url text, bio text, country text, ciudad text, birth_year int, gender text, distance_km double precision, last_active_at timestamptz, photos jsonb)
language sql stable security definer set search_path = public as $$
  with me as (select * from public.profiles where id = auth.uid())
  select p.id, p.display_name, p.avatar_url, p.bio, p.country, p.ciudad, p.birth_year, p.gender,
    public.haversine_km(me.lat, me.lng, p.lat, p.lng) as distance_km,
    p.last_active_at, p.photos
  from public.profiles p, me
  where me.lat is not null and me.lng is not null
    and p.id <> me.id
    and p.lat is not null and p.lng is not null
    and p.is_banned = false
    and not exists(select 1 from public.blocks b where (b.blocker_id=me.id and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=me.id))
  order by distance_km asc
  limit greatest(1, least(p_limit, 20))
$$;
