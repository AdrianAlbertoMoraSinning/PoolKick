-- Production-schema role simulation only, not a login or HTTP/browser test.
-- Fake users have no credentials. Everything is in one rolled-back transaction.
begin;
create temporary table qa_sim_users(label text primary key,id uuid default gen_random_uuid());
create temporary table qa_sim_pool(id text,code text,tournament_id text);
create temporary table qa_sim_evidence(label text,result text);
grant all on qa_sim_users,qa_sim_pool,qa_sim_evidence to authenticated,anon;
insert into qa_sim_users(label) values('admin'),('commissioner'),('player'),('outsider');
insert into auth.users(id,email,raw_user_meta_data,created_at,updated_at)
select id,'qa-sim-'||id||'@example.invalid',jsonb_build_object('display_name','QA simulation '||label),now(),now() from qa_sim_users;
update public.profiles set role='admin' where id=(select id from qa_sim_users where label='admin');
insert into public.matches(id,tournament_id,stage,round,home_team_id,away_team_id,kickoff,status)
select 'qa_sim_match',tournament_id,'QA simulation','QA simulation',home_team_id,away_team_id,now()+interval '2 hours','scheduled'
from public.matches where tournament_id=(select id from public.tournaments where status='active' order by id limit 1) limit 1;
select set_config('request.jwt.claim.sub',(select id::text from qa_sim_users where label='commissioner'),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$declare p jsonb;begin
 p:=public.create_pool_with_member((select tournament_id from public.matches where id='qa_sim_match'),'QA role simulation disposable','classic','private');
 insert into qa_sim_pool values(p->>'id',p->>'code',p->>'tournament_id');
 if not exists(select 1 from public.pool_members where pool_id=p->>'id' and user_id=auth.uid()) then raise exception 'Creator missing membership';end if;
 insert into public.predictions(pool_id,match_id,user_id,home_score,away_score) values(p->>'id','qa_sim_match',auth.uid(),2,1);
 if not exists(select 1 from public.predictions where pool_id=p->>'id' and home_score=2 and points is null) then raise exception 'Future pick not persisted';end if;
 insert into public.comments(pool_id,user_id,text) values(p->>'id',auth.uid(),'QA commissioner chat');
 insert into qa_sim_evidence values('commissioner creates pool, membership, future pick and private chat','PASS');
end $$;
select set_config('request.jwt.claim.sub',(select id::text from qa_sim_users where label='player'),true);
do $$declare p text:=(select id from qa_sim_pool);n int;begin
 if public.join_pool_by_code((select code from qa_sim_pool))<>p then raise exception 'Invitation failed';end if;
 perform public.join_pool_by_code((select code from qa_sim_pool));
 if (select count(*) from public.pool_members where pool_id=p and user_id=auth.uid())<>1 then raise exception 'Duplicate membership';end if;
 insert into qa_sim_evidence values('player joins by invite and repeated join stays idempotent','PASS');
 if exists(select 1 from public.predictions where pool_id=p and user_id<>auth.uid()) then raise exception 'Pre-kickoff opponent picks visible';end if;
 insert into qa_sim_evidence values('opponent picks hidden before kickoff','PASS');
 insert into public.predictions(pool_id,match_id,user_id,home_score,away_score) values(p,'qa_sim_match',auth.uid(),0,0);
 insert into public.predictions(pool_id,match_id,user_id,home_score,away_score) values(p,'qa_sim_match',auth.uid(),1,0) on conflict(pool_id,match_id,user_id) do update set home_score=excluded.home_score,away_score=excluded.away_score;
 if not exists(select 1 from public.predictions where pool_id=p and user_id=auth.uid() and home_score=1 and away_score=0) then raise exception 'Edited pick missing';end if;
 insert into qa_sim_evidence values('own pick insert, edit and readback','PASS');
 update public.predictions set home_score=9 where pool_id=p and user_id<>auth.uid();get diagnostics n=row_count;
 if n<>0 then raise exception 'Player edited opponent pick';end if;
 insert into qa_sim_evidence values('opponent picks cannot be edited','PASS');
 begin
  update public.predictions set home_score=-1 where pool_id=p and user_id=auth.uid();
  raise exception 'Negative score accepted';
 exception when check_violation then null;end;
 insert into qa_sim_evidence values('negative score rejected by database','PASS');
 begin
  update public.profiles set role='admin' where id=auth.uid();
  raise exception 'Player promoted own role';
 exception when insufficient_privilege then null;end;
 update public.matches set status='finished',home_score=9,away_score=0 where id='qa_sim_match';get diagnostics n=row_count;
 if n<>0 then raise exception 'Player changed official score';end if;
 insert into qa_sim_evidence values('player cannot gain admin role or change official result','PASS');
 update public.profiles set display_name='QA simulation player edited',favorite_team='QA simulation favorite' where id=auth.uid();
 if not exists(select 1 from public.profiles where id=auth.uid() and favorite_team='QA simulation favorite') then raise exception 'Profile update missing';end if;
 insert into public.comments(pool_id,user_id,text) values(p,auth.uid(),'QA player chat');
 if (select count(*) from public.comments where pool_id=p)<>2 then raise exception 'Member chat missing';end if;
 insert into qa_sim_evidence values('player profile and member chat persist and read back','PASS');
end $$;
select set_config('request.jwt.claim.sub',(select id::text from qa_sim_users where label='outsider'),true);
do $$declare p text:=(select id from qa_sim_pool);begin
 if exists(select 1 from public.pools where id=p) or exists(select 1 from public.comments where pool_id=p) or exists(select 1 from public.predictions where pool_id=p) then raise exception 'Outsider read private pool data';end if;
 begin
  insert into public.predictions(pool_id,match_id,user_id,home_score,away_score) values(p,'qa_sim_match',auth.uid(),1,1);
  raise exception 'Nonmember prediction accepted';
 exception when insufficient_privilege then null;
 when raise_exception then if SQLERRM<>'Match does not belong to this pool tournament' then raise;end if;end;
 insert into qa_sim_evidence values('nonmember cannot read private data or submit picks','PASS');
end $$;
select set_config('request.jwt.claim.sub',(select id::text from qa_sim_users where label='admin'),true);
update public.matches set kickoff=now()-interval '1 hour' where id='qa_sim_match';
update public.matches set status='finished',home_score=2,away_score=1 where id='qa_sim_match';
do $$declare p text:=(select id from qa_sim_pool);begin
 if not exists(select 1 from public.predictions where pool_id=p and user_id=(select id from qa_sim_users where label='commissioner') and points=5) then raise exception 'Exact score points wrong';end if;
 if not exists(select 1 from public.predictions where pool_id=p and user_id=(select id from qa_sim_users where label='player') and points=3) then raise exception 'Difference points wrong';end if;
 if not exists(select 1 from public.get_global_rankings() where user_id=(select id from qa_sim_users where label='commissioner') and total_points=5 and exact_scores=1) then raise exception 'Global ranking wrong';end if;
 if not exists(select 1 from public.get_tournament_rankings((select tournament_id from qa_sim_pool)) where user_id=(select id from qa_sim_users where label='player') and total_points=3 and correct_predictions=1) then raise exception 'Tournament ranking wrong';end if;
 insert into qa_sim_evidence values('admin final score gives 5/3 points and both ranking RPCs read back','PASS');
end $$;
select set_config('request.jwt.claim.sub',(select id::text from qa_sim_users where label='player'),true);
do $$declare p text:=(select id from qa_sim_pool);begin
 if (select count(*) from public.predictions where pool_id=p)<>2 then raise exception 'Opponent picks not visible after kickoff';end if;
 begin
  update public.predictions set home_score=8 where pool_id=p and user_id=auth.uid();
  raise exception 'Late pick accepted';
 exception when others then if SQLERRM<>'Prediction deadline has passed' then raise;end if;end;
 insert into qa_sim_evidence values('post-kickoff opponent visibility and late edit rejection','PASS');
end $$;
reset role;
select * from qa_sim_evidence order by label;
rollback;
