-- Scoring and tournament choice are fixed after creation, as documented.
-- Revoke the table grant too: column revocation alone cannot override it.
revoke update on public.pools from authenticated;
revoke update (id, name, code, commissioner_id, tournament_id, scoring, visibility, created_at) on public.pools from authenticated;
grant update (name, code, visibility) on public.pools to authenticated;
