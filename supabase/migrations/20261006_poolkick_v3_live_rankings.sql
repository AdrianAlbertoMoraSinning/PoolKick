-- PoolKick V3: real sports provider metadata, atomic pool creation and rankings

alter table public.tournaments add column if not exists provider text not null default 'thesportsdb';
alter table public.tournaments add column if not exists provider_league_id text;
alter table public.tournaments add column if not exists provider_season text;
alter table public.tournaments add column if not exists logo_url text;
alter table public.tournaments add column if not exists sync_enabled boolean not null default true;
alter table public.tournaments add column if not exists last_synced_at timestamptz;

alter table public.teams add column if not exists external_id text;
alter table public.matches add column if not exists venue text;
alter table public.matches add column if not exists minute integer;
alter table public.matches add column if not exists provider_payload jsonb not null default '{}'::jsonb;

create unique index if not exists teams_tournament_external_uidx on public.teams(tournament_id,external_id) where external_id is not null;
create index if not exists matches_status_kickoff_idx on public.matches(status,kickoff);
create index if not exists matches_tournament_kickoff_idx on public.matches(tournament_id,kickoff);

update public.tournaments set provider='thesportsdb',provider_league_id='4429',provider_season='2026',sync_enabled=true where id='t1';
update public.tournaments set provider='thesportsdb',provider_league_id='4480',provider_season='2026-2027',sync_enabled=true where id='t2';
update public.tournaments set provider='thesportsdb',provider_league_id='4502',provider_season='2028',sync_enabled=true where id='t3';
update public.tournaments set provider='thesportsdb',provider_league_id='4499',provider_season='2028',sync_enabled=true where id='t4';

insert into public.pool_members(pool_id,user_id)
select p.id,p.commissioner_id from public.pools p
where not exists(select 1 from public.pool_members pm where pm.pool_id=p.id and pm.user_id=p.commissioner_id)
on conflict do nothing;

create or replace function public.create_pool_with_member(p_tournament_id text,p_name text,p_scoring text default 'classic',p_visibility text default 'private')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_id text:='p_'||replace(gen_random_uuid()::text,'-',''); v_code text; v_try int:=0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Pool name is required'; end if;
  if p_scoring not in ('classic','simple') then raise exception 'Invalid scoring preset'; end if;
  if p_visibility not in ('private','public') then raise exception 'Invalid visibility'; end if;
  if not exists(select 1 from public.tournaments where id=p_tournament_id and status='active') then raise exception 'Tournament is not active'; end if;
  loop
    v_try:=v_try+1; v_code:=upper(substr(md5(random()::text||clock_timestamp()::text),1,6));
    exit when not exists(select 1 from public.pools where code=v_code);
    if v_try>10 then raise exception 'Unable to generate invite code'; end if;
  end loop;
  insert into public.pools(id,tournament_id,name,code,commissioner_id,visibility,scoring) values(v_id,p_tournament_id,trim(p_name),v_code,v_uid,p_visibility,p_scoring);
  insert into public.pool_members(pool_id,user_id) values(v_id,v_uid);
  return jsonb_build_object('id',v_id,'code',v_code,'tournament_id',p_tournament_id,'name',trim(p_name),'scoring',p_scoring,'visibility',p_visibility,'commissioner_id',v_uid);
end $$;
revoke all on function public.create_pool_with_member(text,text,text,text) from public,anon;
grant execute on function public.create_pool_with_member(text,text,text,text) to authenticated;

create or replace function public.get_global_rankings()
returns table(rank bigint,user_id uuid,display_name text,avatar text,total_points bigint,exact_scores bigint,correct_predictions bigint,pools_played bigint)
language sql stable security definer set search_path=''
as $$
with stats as (
 select pr.id user_id,pr.display_name,pr.avatar,coalesce(sum(coalesce(pd.points,0)),0)::bigint total_points,
 count(pd.id) filter(where pd.points=case when po.scoring='simple' then 3 else 5 end)::bigint exact_scores,
 count(pd.id) filter(where coalesce(pd.points,0)>0)::bigint correct_predictions,count(distinct pm.pool_id)::bigint pools_played
 from public.profiles pr left join public.pool_members pm on pm.user_id=pr.id left join public.predictions pd on pd.user_id=pr.id and pd.pool_id=pm.pool_id left join public.pools po on po.id=pd.pool_id
 group by pr.id,pr.display_name,pr.avatar)
select row_number() over(order by total_points desc,exact_scores desc,correct_predictions desc,display_name asc),user_id,display_name,avatar,total_points,exact_scores,correct_predictions,pools_played from stats order by 1;
$$;
revoke all on function public.get_global_rankings() from public,anon;
grant execute on function public.get_global_rankings() to authenticated;

create or replace function public.get_tournament_rankings(p_tournament_id text)
returns table(rank bigint,user_id uuid,display_name text,avatar text,total_points bigint,exact_scores bigint,correct_predictions bigint,pools_played bigint)
language sql stable security definer set search_path=''
as $$
with stats as (
 select pr.id user_id,pr.display_name,pr.avatar,coalesce(sum(coalesce(pd.points,0)),0)::bigint total_points,
 count(pd.id) filter(where pd.points=case when po.scoring='simple' then 3 else 5 end)::bigint exact_scores,
 count(pd.id) filter(where coalesce(pd.points,0)>0)::bigint correct_predictions,count(distinct pm.pool_id)::bigint pools_played
 from public.profiles pr join public.pool_members pm on pm.user_id=pr.id join public.pools po on po.id=pm.pool_id and po.tournament_id=p_tournament_id left join public.predictions pd on pd.user_id=pr.id and pd.pool_id=pm.pool_id
 group by pr.id,pr.display_name,pr.avatar)
select row_number() over(order by total_points desc,exact_scores desc,correct_predictions desc,display_name asc),user_id,display_name,avatar,total_points,exact_scores,correct_predictions,pools_played from stats order by 1;
$$;
revoke all on function public.get_tournament_rankings(text) from public,anon;
grant execute on function public.get_tournament_rankings(text) to authenticated;
