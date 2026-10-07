-- Run with the SQL connector as postgres. All fixtures and edits are rolled back.
begin;
create temporary table qa_evidence(label text,value text);
create temporary table qa_ids(pool_id text,uid uuid,code text);
grant all on qa_evidence,qa_ids to authenticated,anon;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='admin' limit 1),true);
select set_config('request.jwt.claim.role','authenticated',true);
insert into public.matches(id,tournament_id,stage,round,home_team_id,away_team_id,kickoff,status)
select 'qa_final_match_20261007',tournament_id,'QA','QA',home_team_id,away_team_id,now()+interval '2 hours','scheduled'
from public.matches where tournament_id=(select id from public.tournaments where status='active' order by id limit 1) limit 1;
set local role authenticated;
do $$
declare p jsonb; uid uuid:=auth.uid(); n int;
begin
 p:=public.create_pool_with_member((select tournament_id from public.matches where id='qa_final_match_20261007'),'QA temporary production regression','classic','private');
 insert into qa_ids values(p->>'id',uid,p->>'code');
 if not exists(select 1 from public.pools where id=p->>'id') or not exists(select 1 from public.pool_members where pool_id=p->>'id' and user_id=uid) then raise exception 'Pool or creator membership not persisted';end if;
 insert into qa_evidence values('create pool + creator membership','PASS');
 if public.join_pool_by_code(p->>'code')<>p->>'id' then raise exception 'Join failed';end if;
 select count(*) into n from public.pool_members where pool_id=p->>'id' and user_id=uid;
 if n<>1 then raise exception 'Join duplicate';end if;
 insert into qa_evidence values('join pool idempotence','PASS');
 insert into public.predictions(pool_id,match_id,user_id,home_score,away_score) values(p->>'id','qa_final_match_20261007',uid,1,0);
 insert into public.predictions(pool_id,match_id,user_id,home_score,away_score) values(p->>'id','qa_final_match_20261007',uid,2,1) on conflict(pool_id,match_id,user_id) do update set pool_id=excluded.pool_id,match_id=excluded.match_id,user_id=excluded.user_id,home_score=excluded.home_score,away_score=excluded.away_score;
 if not exists(select 1 from public.predictions where pool_id=p->>'id' and home_score=2 and away_score=1) then raise exception 'Prediction not persisted';end if;
 insert into qa_evidence values('prediction insert + update + readback','PASS');
 if has_column_privilege('authenticated','public.predictions','points','UPDATE') or has_column_privilege('authenticated','public.predictions','points','INSERT') then raise exception 'Player can write points';end if;
 insert into qa_evidence values('points are server controlled','PASS');
 insert into public.comments(pool_id,user_id,text) values(p->>'id',uid,'QA temporary comment');
 if not exists(select 1 from public.comments where pool_id=p->>'id' and text='QA temporary comment') then raise exception 'Chat not persisted';end if;
 insert into qa_evidence values('chat insert + readback','PASS');
 update public.profiles set favorite_team='QA temporary profile' where id=uid;
 if not exists(select 1 from public.profiles where id=uid and favorite_team='QA temporary profile') then raise exception 'Profile not persisted';end if;
 insert into qa_evidence values('profile update + readback','PASS');
 insert into public.news_articles(id,category,title_en,title_es,title_fr,summary_en,summary_es,summary_fr,source_name,status,published_at)
 values('qa_final_news_20261007','platform','QA EN','QA ES','QA FR','QA EN','QA ES','QA FR','PoolKick','published',now());
 if not exists(select 1 from public.news_articles where id='qa_final_news_20261007' and title_es='QA ES' and title_fr='QA FR') then raise exception 'News not persisted';end if;
 insert into qa_evidence values('news publish + multilingual readback','PASS');
end $$;
update public.matches set kickoff=now()-interval '1 hour' where id='qa_final_match_20261007';
update public.matches set status='finished',home_score=2,away_score=1 where id='qa_final_match_20261007';
do $$
declare p text:=(select pool_id from qa_ids); uid uuid:=auth.uid();
begin
 if not exists(select 1 from public.predictions where pool_id=p and points=5) then raise exception 'Automatic points failed';end if;
 insert into qa_evidence values('final result + scoring after kickoff','PASS: 5 points');
 if not exists(select 1 from public.get_global_rankings() where user_id=uid and total_points>=5) then raise exception 'Global rankings failed';end if;
 if not exists(select 1 from public.get_tournament_rankings((select tournament_id from public.matches where id='qa_final_match_20261007')) where user_id=uid and total_points>=5) then raise exception 'Tournament rankings failed';end if;
 insert into qa_evidence values('global + tournament rankings','PASS');
 begin
  update public.predictions set home_score=3 where pool_id=p;
  raise exception 'Late pick accepted';
 exception when others then if SQLERRM<>'Prediction deadline has passed' then raise;end if;end;
 insert into qa_evidence values('late pick remains blocked','PASS');
end $$;
update public.news_articles set status='draft' where id='qa_final_news_20261007';
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claim.role','anon',true);
set local role anon;
do $$begin
 if exists(select 1 from public.news_articles where id='qa_final_news_20261007') then raise exception 'Archived news visible to public';end if;
 if exists(select 1 from public.pools where id=(select pool_id from qa_ids)) then raise exception 'Private pool visible to anonymous user';end if;
 if has_function_privilege('anon','public.create_pool_with_member(text,text,text,text)','EXECUTE') then raise exception 'Anonymous pool creation enabled';end if;
 insert into qa_evidence values('anonymous privacy + archived news','PASS');
end $$;
reset role;
select * from qa_evidence order by label;
rollback;
