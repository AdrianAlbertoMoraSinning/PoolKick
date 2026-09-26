-- PoolKick V2: multilingual newsfeed + realtime updates
-- Safe incremental migration for an existing V1 Supabase project.

create table if not exists public.news_articles (
  id text primary key,
  category text not null default 'platform' check (category in ('world-cup','champions','copa','euro','platform')),
  title_en text not null,
  title_es text not null default '',
  title_fr text not null default '',
  summary_en text not null default '',
  summary_es text not null default '',
  summary_fr text not null default '',
  source_name text not null default 'PoolKick',
  source_url text,
  image_url text,
  featured boolean not null default false,
  status text not null default 'published' check (status in ('draft','published','archived')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_articles enable row level security;

drop policy if exists "news public read" on public.news_articles;
create policy "news public read" on public.news_articles
for select using (status='published' or public.is_admin(auth.uid()));

drop policy if exists "admin news write" on public.news_articles;
create policy "admin news write" on public.news_articles
for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

grant select on public.news_articles to anon, authenticated;
grant insert, update, delete on public.news_articles to authenticated;

insert into public.news_articles
(id,category,title_en,title_es,title_fr,summary_en,summary_es,summary_fr,source_name,featured,status,published_at)
values
('news1','world-cup','World Cup prediction hub is ready','El centro de pronósticos del Mundial está listo','Le centre de pronostics de la Coupe du monde est prêt','Create a private World Cup pool, invite friends and lock every score prediction at kickoff.','Crea una quiniela privada del Mundial, invita amigos y bloquea cada pronóstico al inicio del partido.','Créez un pool privé pour la Coupe du monde, invitez vos amis et verrouillez chaque pronostic au coup d’envoi.','PoolKick',true,'published',now()-interval '1 day'),
('news2','champions','Champions League pools are open','Ya puedes crear quinielas de Champions League','Les pools de Ligue des champions sont ouverts','The tournament catalogue already supports a separate Champions League competition and leaderboard.','El catálogo ya permite una competencia y ranking independiente para la Champions League.','Le catalogue prend déjà en charge une compétition et un classement distincts pour la Ligue des champions.','PoolKick',false,'published',now()-interval '2 days'),
('news3','platform','PoolKick launches ad-free','PoolKick inicia sin publicidad','PoolKick démarre sans publicité','The first release is designed without ads. Voluntary donations can support hosting and future improvements.','La primera versión está diseñada sin anuncios. Las donaciones voluntarias pueden apoyar el hosting y futuras mejoras.','La première version est conçue sans publicité. Les dons volontaires peuvent soutenir l’hébergement et les futures améliorations.','PoolKick',false,'published',now()-interval '3 days')
on conflict(id) do update set
category=excluded.category,title_en=excluded.title_en,title_es=excluded.title_es,title_fr=excluded.title_fr,
summary_en=excluded.summary_en,summary_es=excluded.summary_es,summary_fr=excluded.summary_fr,
source_name=excluded.source_name,featured=excluded.featured,status=excluded.status;

-- Postgres Changes powers live pool chat, score updates and news refreshes.
do $$
declare t text;
begin
  foreach t in array array['comments','predictions','matches','news_articles']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;
