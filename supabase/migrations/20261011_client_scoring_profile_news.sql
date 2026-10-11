-- Oct 11, 2026 client revisions: PoolKick 4-3-2-1 scoring, exact-score rankings,
-- profile avatar uploads, and general live-news category.

create or replace function public.recalculate_match_points(target_match_id text)
returns void language plpgsql security definer set search_path=public as $$
declare r record; p record; actual_outcome text; pred_outcome text;
begin
  select * into r from matches where id=target_match_id and status='finished';
  if not found then return; end if;
  actual_outcome := case when r.home_score=r.away_score then 'D' when r.home_score>r.away_score then 'H' else 'A' end;
  for p in select pr.*,po.scoring from predictions pr join pools po on po.id=pr.pool_id where pr.match_id=target_match_id loop
    pred_outcome := case when p.home_score=p.away_score then 'D' when p.home_score>p.away_score then 'H' else 'A' end;
    update predictions set points=case
      when p.scoring='classic' and actual_outcome='D' and p.home_score=r.home_score and p.away_score=r.away_score then 2
      when p.scoring='classic' and actual_outcome='D' and pred_outcome='D' then 1
      when p.scoring='classic' and actual_outcome<>'D' and p.home_score=r.home_score and p.away_score=r.away_score then 4
      when p.scoring='classic' and actual_outcome<>'D' and pred_outcome=actual_outcome then 3
      when p.scoring='simple' and p.home_score=r.home_score and p.away_score=r.away_score then 3
      when p.scoring='simple' and pred_outcome=actual_outcome then 1
      else 0 end,updated_at=now() where id=p.id;
  end loop;
end; $$;

create or replace function private.get_global_rankings_impl()
returns table(rank bigint,user_id uuid,display_name text,avatar text,total_points bigint,exact_scores bigint,correct_predictions bigint,pools_played bigint)
language sql stable security definer set search_path='' as $$
with stats as (
 select pr.id user_id,pr.display_name,pr.avatar,coalesce(sum(coalesce(pd.points,0)),0)::bigint total_points,
 count(pd.id) filter(where m.status='finished' and pd.home_score=m.home_score and pd.away_score=m.away_score)::bigint exact_scores,
 count(pd.id) filter(where coalesce(pd.points,0)>0)::bigint correct_predictions,count(distinct pm.pool_id)::bigint pools_played
 from public.profiles pr left join public.pool_members pm on pm.user_id=pr.id left join public.predictions pd on pd.user_id=pr.id and pd.pool_id=pm.pool_id left join public.matches m on m.id=pd.match_id
 group by pr.id,pr.display_name,pr.avatar)
select row_number() over(order by total_points desc,exact_scores desc,correct_predictions desc,display_name asc),user_id,display_name,avatar,total_points,exact_scores,correct_predictions,pools_played from stats order by 1;
$$;

create or replace function private.get_tournament_rankings_impl(p_tournament_id text)
returns table(rank bigint,user_id uuid,display_name text,avatar text,total_points bigint,exact_scores bigint,correct_predictions bigint,pools_played bigint)
language sql stable security definer set search_path='' as $$
with stats as (
 select pr.id user_id,pr.display_name,pr.avatar,coalesce(sum(coalesce(pd.points,0)),0)::bigint total_points,
 count(pd.id) filter(where m.status='finished' and pd.home_score=m.home_score and pd.away_score=m.away_score)::bigint exact_scores,
 count(pd.id) filter(where coalesce(pd.points,0)>0)::bigint correct_predictions,count(distinct pm.pool_id)::bigint pools_played
 from public.profiles pr join public.pool_members pm on pm.user_id=pr.id join public.pools po on po.id=pm.pool_id and po.tournament_id=p_tournament_id left join public.predictions pd on pd.user_id=pr.id and pd.pool_id=pm.pool_id left join public.matches m on m.id=pd.match_id
 group by pr.id,pr.display_name,pr.avatar)
select row_number() over(order by total_points desc,exact_scores desc,correct_predictions desc,display_name asc),user_id,display_name,avatar,total_points,exact_scores,correct_predictions,pools_played from stats order by 1;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,3145728,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=3145728,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "avatar public read" on storage.objects;
create policy "avatar public read" on storage.objects for select using(bucket_id='avatars');
drop policy if exists "avatar owner insert" on storage.objects;
create policy "avatar owner insert" on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "avatar owner update" on storage.objects;
create policy "avatar owner update" on storage.objects for update to authenticated using(bucket_id='avatars' and owner_id=(select auth.uid())::text) with check(bucket_id='avatars' and owner_id=(select auth.uid())::text);
drop policy if exists "avatar owner delete" on storage.objects;
create policy "avatar owner delete" on storage.objects for delete to authenticated using(bucket_id='avatars' and owner_id=(select auth.uid())::text);

alter table public.news_articles drop constraint if exists news_articles_category_check;
alter table public.news_articles add constraint news_articles_category_check check(category in ('world-cup','champions','copa','euro','platform','general'));
