-- Deadline checks apply to submitted picks, not server-calculated points.
drop trigger if exists prediction_deadline_guard on public.predictions;
create trigger prediction_deadline_guard
before insert or update of pool_id,match_id,user_id,home_score,away_score on public.predictions
for each row execute function public.guard_prediction_deadline();

-- A player may write score picks; points remain controlled by the scoring engine.
revoke insert,update on public.predictions from anon,authenticated;
grant insert(pool_id,match_id,user_id,home_score,away_score) on public.predictions to authenticated;
grant update(pool_id,match_id,user_id,home_score,away_score) on public.predictions to authenticated;

create or replace function public.guard_prediction_deadline()
returns trigger language plpgsql set search_path=''
as $$
declare m public.matches; pool_tournament text;
begin
  select * into m from public.matches where id=new.match_id;
  select tournament_id into pool_tournament from public.pools where id=new.pool_id;
  if m.id is null or pool_tournament is distinct from m.tournament_id then
    raise exception 'Match does not belong to this pool tournament';
  end if;
  if m.kickoff<=now() or m.status<>'scheduled' then
    raise exception 'Prediction deadline has passed';
  end if;
  return new;
end;
$$;
