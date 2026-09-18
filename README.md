# PoolKick — Football Prediction Pools

PoolKick is a responsive web platform for private social prediction pools focused on football tournaments rather than domestic leagues. The initial tournament catalogue includes World Cup, UEFA Champions League, UEFA EURO and Copa América.

## Included

- Public landing page and product explanation
- Player registration/login UI
- Demo/local mode that works immediately with no credentials
- Optional Supabase production mode
- User profiles and avatar selection
- Tournament catalogue
- Create pool / join by code
- Exact-score predictions with kickoff locking
- Automatic points calculation
- Leaderboard and player statistics
- Commissioner controls
- Pool chat / reactions area
- In-app notifications
- Platform admin dashboard
- Tournament activation/deactivation and match result administration
- Bilingual EN/ES interface foundation
- Full in-app User Manual
- Netlify configuration
- Supabase schema, RLS policies and seed data

## Quick start

```bash
npm install
npm run dev
```

The app runs in **Demo Mode** when no Supabase keys are present. Demo Mode stores data in browser localStorage and is perfect for design review and user acceptance testing.

### Demo accounts

- `adrian@poolkick.demo` — player
- `marlon@poolkick.demo` — platform administrator

Any password is accepted in Demo Mode.

## Production with Supabase

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Restart the dev server or deploy to Netlify.
6. In Netlify, add both variables under **Site configuration → Environment variables**.

The app automatically detects Supabase configuration. Demo Mode remains available as a fallback if credentials are absent.

## GitHub + Netlify deployment

1. Create a new GitHub repository.
2. Upload all files from this project root (do not upload the enclosing ZIP folder as a nested folder).
3. Import the repository in Netlify.
4. Netlify reads `netlify.toml` automatically.
5. Build command: `npm run build`
6. Publish directory: `dist`
7. Add Supabase environment variables if production shared data is required.

## Branding

The temporary brand is **PoolKick**. Marlon's final name, logo and colors can be replaced centrally in `src/config.js` and the CSS variables at the top of `src/styles.css`.

## Scoring defaults

- Exact score: 5 points
- Correct goal difference: 3 points
- Correct winner/draw: 2 points
- Incorrect: 0 points

A commissioner can choose a simpler 3/1/0 preset when creating a pool. The database stores scoring rules per pool, so additional formats can be added without changing existing pools.

## Important product note

PoolKick is designed as a social prediction game. It does not process wagers or prize money. Team crest/logo URLs are data fields; official logos should only be loaded from a licensed or otherwise permitted source.
