-- PoolKick V2 security and performance hardening

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.profiles
    where id = uid and role = 'admin'
  );
$$;

create or replace function private.is_pool_member(pid text, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.pool_members
    where pool_id = pid and user_id = uid
  );
$$;

revoke all on function private.is_admin(uuid) from public;
revoke all on function private.is_pool_member(text,uuid) from public;
grant execute on function private.is_admin(uuid) to anon, authenticated;
grant execute on function private.is_pool_member(text,uuid) to authenticated;

create or replace function private.join_pool_by_code_impl(join_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid text;
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Authentication required';
  end if;

  select id into pid
  from public.pools
  where code = upper(trim(join_code))
  limit 1;

  if pid is null then return null; end if;

  insert into public.pool_members(pool_id,user_id)
  values(pid,uid)
  on conflict do nothing;

  return pid;
end;
$$;

revoke all on function private.join_pool_by_code_impl(text) from public;
grant execute on function private.join_pool_by_code_impl(text) to authenticated;

create or replace function public.join_pool_by_code(join_code text)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.join_pool_by_code_impl(join_code);
$$;

revoke all on function public.join_pool_by_code(text) from public, anon;
grant execute on function public.join_pool_by_code(text) to authenticated;

create or replace function public.guard_prediction_deadline()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ko timestamptz;
begin
  select kickoff into ko
  from public.matches
  where id = new.match_id;

  if ko <= now() then
    raise exception 'Prediction deadline has passed';
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.on_match_finished() from public, anon, authenticated;
revoke all on function public.recalculate_match_points(text) from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

drop policy if exists "pools member read" on public.pools;
create policy "pools member read" on public.pools
for select to authenticated
using (
  commissioner_id = (select auth.uid())
  or private.is_pool_member(id,(select auth.uid()))
  or private.is_admin((select auth.uid()))
);

drop policy if exists "members pool read" on public.pool_members;
create policy "members pool read" on public.pool_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.is_pool_member(pool_id,(select auth.uid()))
  or private.is_admin((select auth.uid()))
);

drop policy if exists "predictions fair read" on public.predictions;
create policy "predictions fair read" on public.predictions
for select to authenticated
using (
  private.is_admin((select auth.uid()))
  or (
    private.is_pool_member(pool_id,(select auth.uid()))
    and (
      user_id = (select auth.uid())
      or exists(
        select 1 from public.matches m
        where m.id = match_id and m.kickoff <= now()
      )
    )
  )
);

drop policy if exists "comments member read" on public.comments;
create policy "comments member read" on public.comments
for select to authenticated
using (
  private.is_pool_member(pool_id,(select auth.uid()))
  or private.is_admin((select auth.uid()))
);

drop policy if exists "own notifications read" on public.notifications;
create policy "own notifications read" on public.notifications
for select to authenticated
using (
  (select auth.uid()) = user_id
  or private.is_admin((select auth.uid()))
);

drop policy if exists "profile owner update" on public.profiles;
create policy "profile owner update" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "create pool" on public.pools;
create policy "create pool" on public.pools
for insert to authenticated
with check ((select auth.uid()) = commissioner_id);

drop policy if exists "commissioner update pool" on public.pools;
create policy "commissioner update pool" on public.pools
for update to authenticated
using ((select auth.uid()) = commissioner_id)
with check ((select auth.uid()) = commissioner_id);

drop policy if exists "creator membership insert" on public.pool_members;
create policy "creator membership insert" on public.pool_members
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists(
    select 1 from public.pools p
    where p.id = pool_id
      and p.commissioner_id = (select auth.uid())
  )
);

drop policy if exists "leave own pool" on public.pool_members;
create policy "leave own pool" on public.pool_members
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "own prediction insert" on public.predictions;
create policy "own prediction insert" on public.predictions
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and private.is_pool_member(pool_id,(select auth.uid()))
);

drop policy if exists "own prediction update" on public.predictions;
create policy "own prediction update" on public.predictions
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and private.is_pool_member(pool_id,(select auth.uid()))
);

drop policy if exists "member comment insert" on public.comments;
create policy "member comment insert" on public.comments
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and private.is_pool_member(pool_id,(select auth.uid()))
);

drop policy if exists "own notification update" on public.notifications;
create policy "own notification update" on public.notifications
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "admin tournament write" on public.tournaments;
create policy "admin tournament insert" on public.tournaments
for insert to authenticated with check (private.is_admin((select auth.uid())));
create policy "admin tournament update" on public.tournaments
for update to authenticated
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));
create policy "admin tournament delete" on public.tournaments
for delete to authenticated
using (private.is_admin((select auth.uid())));

drop policy if exists "admin team write" on public.teams;
create policy "admin team insert" on public.teams
for insert to authenticated with check (private.is_admin((select auth.uid())));
create policy "admin team update" on public.teams
for update to authenticated
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));
create policy "admin team delete" on public.teams
for delete to authenticated
using (private.is_admin((select auth.uid())));

drop policy if exists "admin match write" on public.matches;
create policy "admin match insert" on public.matches
for insert to authenticated with check (private.is_admin((select auth.uid())));
create policy "admin match update" on public.matches
for update to authenticated
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));
create policy "admin match delete" on public.matches
for delete to authenticated
using (private.is_admin((select auth.uid())));

drop policy if exists "news public read" on public.news_articles;
create policy "news public read" on public.news_articles
for select
using (
  status = 'published'
  or private.is_admin((select auth.uid()))
);

drop policy if exists "admin news write" on public.news_articles;
create policy "admin news insert" on public.news_articles
for insert to authenticated with check (private.is_admin((select auth.uid())));
create policy "admin news update" on public.news_articles
for update to authenticated
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));
create policy "admin news delete" on public.news_articles
for delete to authenticated
using (private.is_admin((select auth.uid())));

create index if not exists idx_comments_pool_id on public.comments(pool_id);
create index if not exists idx_comments_user_id on public.comments(user_id);
create index if not exists idx_matches_away_team_id on public.matches(away_team_id);
create index if not exists idx_matches_home_team_id on public.matches(home_team_id);
create index if not exists idx_matches_tournament_id on public.matches(tournament_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_pool_members_user_id on public.pool_members(user_id);
create index if not exists idx_pools_commissioner_id on public.pools(commissioner_id);
create index if not exists idx_pools_tournament_id on public.pools(tournament_id);
create index if not exists idx_predictions_match_id on public.predictions(match_id);
create index if not exists idx_predictions_user_id on public.predictions(user_id);
create index if not exists idx_teams_tournament_id on public.teams(tournament_id);
create index if not exists idx_news_status_published_at on public.news_articles(status,published_at desc);

drop function if exists public.is_admin(uuid);
drop function if exists public.is_pool_member(text,uuid);
