# Production QA — PoolKick 3.0.1

Status: **conditional; final browser acceptance is blocked**.

Target: https://poolkick.netlify.app/ · repository: AdrianAlbertoMoraSinning/PoolKick.
Database: zexnqxvgenqkizrpdyqm. Review began October 6, 2026, Edmonton time.

## Verified fixes

- Fixed state corruption: recalculation returned a predictions array instead of the application state.
- Fixed automatic scoring in production: deadline enforcement blocked the server's point updates after kickoff. Scoped the deadline trigger to submitted pick fields; player roles cannot insert/update points. Added tournament/match validation and scheduled-match enforcement.
- Profile success now waits for a confirmed database write. Predictions, comments, results and news read back returned rows and update UI state after persistence; saving errors and busy states are surfaced.
- Rankings refreshes for changed predictions, results and player profiles, rather than only record-count changes.
- Sports synchronization reports partial failures, times out provider requests, filters by configured league and season, and does not report an empty provider response as successful fixture synchronization. Tournament creation reports saved state separately from a sync warning.
- Removed synthetic public seed data from production loading/error states and hardcoded "Ready" assertions in Admin.
- Added image fallbacks, score input validation, accessible score labels, multilingual save/status text, small-screen wrapping and modal scrolling. These CSS adjustments have not received browser visual acceptance.
- Donate's unconfigured payment action is disabled and the existing explanation remains visible. No payment destination was invented.
- News removal archives the article as a draft, preserving its database record.
- Added dependency lockfile, pinned package versions and CI validation on main.

## Evidence

- Production build: PASS (`npm run build`). Bundler still notes a JavaScript chunk over 500 kB; no performance benchmark was run.
- Regression tests: 8 PASS (`npm test`).
- Static React module rendering: 36 PASS (`npm run test:render`), covering 12 screens in EN/ES/FR with fixtures. This is not browser interaction or responsive testing.
- Database transaction tests: 11 PASS (`tests/database-qa.sql`). Created and read back a pool and its creator membership; verified idempotent joining; inserted and updated a prediction using ON CONFLICT; verified profile, chat and multilingual news writes; recorded a final result after kickoff and confirmed 5 points; verified both ranking RPCs; rejected a late pick; checked anonymous privacy and draft visibility. All test rows and profile edits were rolled back.
- sports-sync deployed as version 3. An unauthenticated HTTP request returns 401 "Authentication required". Admin-authorized provider synchronization remains untested in this browser session.
- Security Advisor: no new database-policy findings; existing warning for disabled leaked-password protection remains.

## Browser acceptance and remaining limits

The live landing page and login form loaded. The secure sign-in flow surfaced "Failed to fetch". The browser then restricted observation of the credential-protected document; the permitted navigation recovery did not restore subsequent observation. No administrator dashboard was positively verified. Authentication logs include an admin login but do not establish that this browser has a usable application session.

| Requested area | Evidence | Remaining acceptance |
|---|---|---|
| Create pool / My Pools | Rendering and production database RPC tests pass | Actual form submission, reload and invite flow in browser |
| Rankings | Scoring and global/tournament RPC tests pass | Browser filter interaction and result refresh |
| Live Scores / Tournaments | Rendering passes; sync code reviewed and deployed | Authorized sync invocation and provider completeness |
| Profile | Rendering and database write/readback pass | Browser save followed by full reload |
| News / Admin | Rendering and database publish/archive/readback pass | Browser forms, error states and role navigation |
| Donate | No donation URL configured | Requires an owner-supplied payment URL; no transaction tested |
| Manual | EN/ES/FR static rendering passes | Browser section navigation and visual review |
| EN/ES/FR | Static module rendering and message-key parity pass | Live language changes and persisted locale after reload |
| Mobile / desktop / logos | CSS and fallback fixes reviewed | Visual QA at mobile and desktop sizes; external artwork loading |

At inspection the database held 4 tournaments and only 10 provider matches, all finished, with no upcoming fixture coverage. EURO and Copa América had no match rows. The free provider integration does not establish full live coverage; this cannot be certified as complete sports data.

Final production QA must remain open until the browser session is usable and every pending acceptance item above is exercised against the deployed build.
