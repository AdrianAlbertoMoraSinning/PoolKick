# PoolKick V3 — Football Prediction Pools

PoolKick is a mobile-first social football prediction platform for private groups and tournament-based competitions.

## Client direction

The current product follows Marlon's requests:

- English, Spanish and French available at any time
- Football newsfeed integrated into the product
- Voluntary donation flow instead of advertising
- No ads in the initial product
- Temporary PoolKick name/logo kept configurable until the final identity is supplied
- Private pools, chat, predictions and automatic scoring
- Global and tournament player rankings
- Real team and tournament artwork when supplied by the sports data provider
- Live/results center inspired by mainstream score apps, without copying their UI or branding
- Automatic sports-data synchronization when an administrator creates or activates a configured tournament
- Supabase Realtime support for pool chat, match-result changes, prediction scoring and news updates

## Core product

- Public multilingual landing page
- Supabase Auth production mode
- Profiles and avatars
- Tournament catalogue
- Create private pool / join by code
- Atomic pool creation: pool + commissioner membership are committed together
- Exact-score predictions
- Server-side kickoff deadline guard
- Hidden pre-kickoff picks via RLS
- Automatic scoring and pool leaderboards
- Global and tournament rankings
- Private pool chat
- Live Scores / Results center
- Team and tournament logos from the sports provider
- Commissioner tools
- Platform admin dashboard
- Automatic tournament sports sync
- Multilingual football news editor
- Public and authenticated news pages
- Ad-free donation/support page
- EN / ES / FR interface and manual
- Netlify + Supabase production architecture

## Sports data

PoolKick V3 includes a Supabase Edge Function at:

```text
supabase/functions/sports-sync/index.ts
```

The current provider is **TheSportsDB**. The integration stores provider IDs in PoolKick rather than coupling pool/scoring logic to the external API.

When an administrator adds a tournament in Admin, PoolKick stores:

- provider league ID
- provider season
- tournament metadata

and immediately runs the sports sync. The sync can populate:

- tournament artwork
- teams
- team logos
- fixtures
- kickoff timestamps
- scores/results
- match status
- venue/provider metadata

The Admin panel also includes manual **Sync now** controls for one tournament or all configured tournaments.

### Free-provider limitation

The initial TheSportsDB integration can operate with the provider's free API key, but the free API returns limited schedule/team result sets. Full LiveScore-style depth and frequent live-score coverage should use a paid sports-data plan or another licensed provider. The PoolKick database layer is designed so the provider can be upgraded without replacing pool, prediction or ranking logic.

## Production with Supabase

Netlify uses:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

For an existing PoolKick production database, the current migrations are:

```text
supabase/migrations/20260926_poolkick_v2.sql
supabase/migrations/20260926_poolkick_v2_hardening.sql
supabase/migrations/20261006_poolkick_v3_live_rankings.sql
```

V3 adds sports-provider metadata, atomic pool creation and ranking RPCs.

## Pool creation fix

V3 uses the authenticated RPC:

```text
create_pool_with_member(...)
```

The pool and its commissioner membership are written in the same database transaction. This prevents the previous condition where a pool could exist but not appear to its creator because the `pool_members` insert failed separately.

## Rankings

Authenticated users have a dedicated **Rankings** tab. Rankings can be viewed:

- overall
- by tournament

The ranking RPCs return aggregated statistics only and do not expose hidden pre-kickoff predictions.

## Admin role

Marlon Molina's production account is the platform administrator. Admin can manage tournaments, synchronize sports data, enter/override results where needed, and publish multilingual news.

## Donations

`APP.donationUrl` in `src/config.js` remains empty until Marlon selects the final payment provider/link. PoolKick does not store card data.

## Branding

The current name **PoolKick** remains temporary. The final name/logo can be replaced centrally after Marlon supplies the final identity.

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

PoolKick is a social prediction game. It does not process wagers or prize money.
