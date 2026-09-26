# PoolKick V2 — Football Prediction Pools

PoolKick is a mobile-first social football prediction platform for private groups and tournament-based competitions.

## V2 client direction

This revision follows Marlon's September 2026 product direction:

- English, Spanish and French available at any time
- Football newsfeed integrated into the product
- Voluntary donation flow instead of advertising
- No ads in the initial product
- Temporary PoolKick name/logo kept configurable until the final identity is supplied
- Mobile navigation inspired by social football apps, while keeping rankings and chat private to each pool
- Supabase Realtime support for pool chat, match-result changes, prediction scoring and news updates

## Core product

- Public multilingual landing page
- Supabase Auth production mode
- Demo/local fallback only when Supabase environment variables are absent
- Profiles and avatars
- Tournament catalogue
- Create private pool / join by code
- Exact-score predictions
- Server-side kickoff deadline guard
- Hidden pre-kickoff picks via RLS
- Automatic scoring and leaderboards
- Private pool chat
- Commissioner tools
- Platform admin dashboard
- Multilingual football news editor
- Public and authenticated news pages
- Ad-free donation/support page
- Full EN / ES / FR user manual
- Netlify configuration
- Supabase schema, RLS and incremental V2 migration

## Local setup

```bash
npm install
npm run dev
```

Without Supabase credentials the app uses Demo Mode and browser localStorage.

### Demo accounts

- `adrian@poolkick.demo` — player
- `marlon@poolkick.demo` — platform administrator

Any password is accepted only in Demo Mode.

## Production with Supabase

Set these Netlify environment variables:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

The variable name keeps `ANON_KEY` for code compatibility, but the value should be the modern Supabase publishable key.

For a new project run:

```
supabase/schema.sql
```

For an existing V1 PoolKick database run the migrations in order:

```
supabase/migrations/20260926_poolkick_v2.sql
supabase/migrations/20260926_poolkick_v2_hardening.sql
```

The first V2 migration adds `news_articles`, multilingual content fields and the Realtime publication entries used by comments, predictions, matches and news. The hardening migration tightens SECURITY DEFINER exposure, optimizes RLS evaluation and adds covering indexes for the main foreign-key access paths.

## Admin role

New Auth users start as `player`. Promote Marlon's production profile to `admin` directly in Supabase after his real account exists. Do not expose a browser-side "make me admin" control.

## News strategy

V2 uses a curated news table so PoolKick does not scrape or republish copyrighted articles. Administrators store short multilingual summaries and can link to the original source. A licensed football/news provider can later automate ingestion.

## Donations

`APP.donationUrl` in `src/config.js` is intentionally empty until Marlon chooses the final payment provider/link. The donation page is already live-ready and does not store card data.

## Branding

The temporary name is **PoolKick**. When Marlon supplies the final identity, update centrally:

- `src/config.js`
- CSS brand variables
- favicon / app icons
- final logo asset

## Scoring defaults

Classic 5–3–2:
- Exact score: 5
- Correct goal difference: 3
- Correct winner/draw: 2
- Wrong result: 0

Simple 3–1:
- Exact score: 3
- Correct winner/draw: 1
- Wrong result: 0

## Product boundary

PoolKick is designed as a social prediction game. It does not process wagers or prize money.
