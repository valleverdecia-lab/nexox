-- received whispers view (anonymous)
create or replace function public.get_received_whispers()
returns table(id uuid, body text, created_at timestamptz, from_name text, distance_km double precision, post_id uuid, read_at timestamptz)
language sql stable security definer set search_path = public as $$
  select w.id, w.body, w.created_at, coalesce(nullif(w.from_name,''),'Alguien'),
    case when w.from_lat is not null and w.from_lng is not null and p.lat is not null and p.lng is not null
      then public.haversine_km(p.lat,p.lng,w.from_lat,w.from_lng) else null end,
    w.post_id, w.read_at
  from public.whispers w
  join public.profiles p on p.id = auth.uid()
  where w.to_id = auth.uid()
  order by w.created_at desc
  limit 100
$$;
