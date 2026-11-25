-- RLS ENABLE
alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.whispers enable row level security;
alter table public.events enable row level security;
alter table public.event_schedule enable row level security;
alter table public.affiliates enable row level security;
alter table public.affiliate_hits enable row level security;
alter table public.affiliate_conversions enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_posts enable row level security;
alter table public.notifications enable row level security;
alter table public.daily_questions enable row level security;
alter table public.daily_answers enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- drop existing policies if any (idempotent-ish)
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- PROFILES
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_owner())
  with check (id = auth.uid() or public.is_owner());
create policy profiles_delete_owner on public.profiles for delete to authenticated using (public.is_owner() or id = auth.uid());

-- LIKES
create policy likes_select on public.likes for select to authenticated using (from_id = auth.uid() or to_id = auth.uid() or public.is_owner());
create policy likes_insert on public.likes for insert to authenticated with check (from_id = auth.uid());
create policy likes_delete on public.likes for delete to authenticated using (from_id = auth.uid() or public.is_owner());

-- MATCHES
create policy matches_select on public.matches for select to authenticated using (user_a = auth.uid() or user_b = auth.uid() or public.is_owner());
create policy matches_insert on public.matches for insert to authenticated with check (user_a = auth.uid() or user_b = auth.uid() or public.is_owner());

-- MESSAGES
create policy messages_select on public.messages for select to authenticated
  using (public.is_owner() or exists(select 1 from public.matches m where m.id = match_id and (m.user_a=auth.uid() or m.user_b=auth.uid())));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and exists(select 1 from public.matches m where m.id = match_id and (m.user_a=auth.uid() or m.user_b=auth.uid())));

-- POSTS / COMMENTS (La Calle)
create policy posts_select on public.posts for select to authenticated using (true);
create policy posts_insert on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy posts_delete on public.posts for delete to authenticated using (author_id = auth.uid() or public.is_owner());
create policy comments_select on public.comments for select to authenticated using (true);
create policy comments_insert on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated using (author_id = auth.uid() or public.is_owner());

-- WHISPERS: direct table access restricted; use RPCs. Owner can read all.
create policy whispers_select_owner on public.whispers for select to authenticated using (public.is_owner() or from_id = auth.uid());
create policy whispers_insert_none on public.whispers for insert to authenticated with check (false);
create policy whispers_update_owner on public.whispers for update to authenticated using (public.is_owner() or to_id = auth.uid());

-- EVENTS
create policy events_select on public.events for select to authenticated using (true);
create policy events_write_owner on public.events for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy event_schedule_select on public.event_schedule for select to authenticated using (true);
create policy event_schedule_write_owner on public.event_schedule for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- AFFILIATES: owner only
create policy affiliates_owner on public.affiliates for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy affiliate_hits_owner_sel on public.affiliate_hits for select to authenticated using (public.is_owner());
create policy affiliate_hits_insert_any on public.affiliate_hits for insert to anon, authenticated with check (true);
create policy affiliate_conv_owner on public.affiliate_conversions for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- GROUPS
create policy groups_select on public.groups for select to authenticated using (true);
create policy groups_insert on public.groups for insert to authenticated with check (owner_id = auth.uid());
create policy groups_update on public.groups for update to authenticated using (owner_id = auth.uid() or public.is_owner());
create policy groups_delete on public.groups for delete to authenticated using (owner_id = auth.uid() or public.is_owner());
create policy group_members_select on public.group_members for select to authenticated using (true);
create policy group_members_insert on public.group_members for insert to authenticated with check (user_id = auth.uid());
create policy group_members_delete on public.group_members for delete to authenticated using (user_id = auth.uid() or public.is_owner() or exists(select 1 from public.groups g where g.id=group_id and g.owner_id=auth.uid()));
create policy group_posts_select on public.group_posts for select to authenticated using (true);
create policy group_posts_insert on public.group_posts for insert to authenticated with check (author_id = auth.uid() and exists(select 1 from public.group_members gm where gm.group_id=group_posts.group_id and gm.user_id=auth.uid()));
create policy group_posts_delete on public.group_posts for delete to authenticated using (author_id = auth.uid() or public.is_owner());

-- NOTIFICATIONS
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid() or public.is_owner());
create policy notifications_update on public.notifications for update to authenticated using (user_id = auth.uid());
create policy notifications_insert_owner on public.notifications for insert to authenticated with check (public.is_owner() or user_id = auth.uid());

-- DAILY QUESTIONS
create policy daily_questions_select on public.daily_questions for select to authenticated using (true);
create policy daily_questions_write on public.daily_questions for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy daily_answers_select on public.daily_answers for select to authenticated using (true);
create policy daily_answers_insert on public.daily_answers for insert to authenticated with check (user_id = auth.uid());
create policy daily_answers_update on public.daily_answers for update to authenticated using (user_id = auth.uid());

-- BLOCKS/REPORTS
create policy blocks_select on public.blocks for select to authenticated using (blocker_id = auth.uid() or public.is_owner());
create policy blocks_insert on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated using (blocker_id = auth.uid());
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_select_owner on public.reports for select to authenticated using (public.is_owner());
