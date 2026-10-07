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
- Regression tests: 14 PASS (`npm test`), including session hydration, auth/profile failure propagation and deferred auth subscriptions with logout/unmount cancellation.
- Static React module rendering: 36 PASS (`npm run test:render`), covering 12 screens in EN/ES/FR with fixtures. This is not browser interaction or responsive testing.
- Database transaction tests: 13 PASS (`tests/database-qa.sql`). Created and read back a pool and its creator membership; verified idempotent joining; inserted and updated a prediction using ON CONFLICT; verified profile, chat and multilingual news writes; recorded a final result after kickoff and confirmed 5 points; verified both ranking RPCs; rejected a late pick; checked anonymous privacy and draft visibility. All test rows and profile edits were rolled back.
- sports-sync deployed as version 4. An unauthenticated HTTP request returns 401 "Authentication required". Admin-authorized provider synchronization remains untested in this browser session.
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

## Sign-in follow-up

Removed full-page reloads after sign-in and immediate-session sign-up. Sign-in now resolves only after loading the account profile and its permitted database data; failures propagate to the form. Added auth-session subscriptions with deferred database work, immediate private-data cleanup on sign-out, subscription cleanup and generation guards against stale loads restoring private data after logout.

The public production news loaded in the cloud browser, but a secure sign-in attempt still returned a network error before a corresponding request appeared in Supabase auth logs. An independent OPTIONS request to the password-token endpoint returned HTTP 200 with the required CORS headers; this does not establish connectivity from the cloud browser or successful authenticated login. No credential, password, RLS or network-protection changes were made. The session-flow correction is tested; the live browser login remains unverified.


## Further production investigation

- Supabase remains ACTIVE_HEALTHY; Marlon's existing admin email is confirmed and the account is not currently banned. A narrow log window for the last failed sign-in contains successful public data GETs and our OPTIONS diagnostic, but no password-token POST. No evidence establishes a rejected password or broken admin permission. Cloud-browser sign-in remains blocked/unverified; no further automated credential retries were made.
- Live public browser checks passed for EN/ES/FR language switches, localized news, Champions League filtering, empty Copa América news, navigation back home, manual language switching and jumping to Administration. Desktop news and manual were visually inspected. This does not cover authenticated modules or mobile viewport acceptance.
- Fixed sync identities: new team IDs are scoped to their tournament; existing team/match IDs remain stable, preserving linked picks; missing provider artwork retains an existing logo. Fixtures already assigned to another tournament are rejected before writes. Global external-event uniqueness remains enforced by the database. Empty scores remain null, and malformed kickoff/score data raises an error instead of fabricating results. Three additional regression tests passed.
- Applied fixed_pool_rules migration: authenticated clients cannot change a pool's scoring, tournament, creator, ID or creation timestamp after creation. Pool name/code/visibility updates retain existing row policies. The expanded database suite passed all 13 checks, including attempted scoring/tournament changes; transaction fixtures and profile edits were rolled back, with zero QA rows remaining.
- sports-sync version 4 is ACTIVE and continues to reject anonymous requests with HTTP 401. Real admin-authorized provider synchronization is still pending.
- Donate was verified in the live public page: the payment action is disabled and explicitly says that Marlon must supply the final payment link.

## Authorized simulation

Executed 33 React component interaction scenarios using isolated demo fixtures in jsdom (11 scenarios in each of EN/ES/FR). Covers forms, route changes, saves, error feedback, local persistence, role navigation, automatic points, Rankings, Live Scores filters, news publication/archive and mobile menu state. Added `npm run test:simulation` to CI. Fixed demo Rankings returning an empty list; production continues to use Supabase RPCs.

Executed 11 additional production-schema SQL role scenarios with four fictitious users without credentials. Authenticated identities and RLS were simulated inside one rolled-back transaction; this does not exercise real Auth or browser HTTP. Verified member/nonmember isolation, hidden opponent picks, edit restrictions, role/result restrictions, profile/chat writes, exact/difference points and both ranking RPCs. Independent cleanup query found zero simulation auth users, profiles, matches or pools remaining. Marlon's account was untouched.

Simulation is approved within these boundaries. Production login, mobile CSS/device acceptance, provider synchronization and payment activation remain open. Detailed Spanish evidence: `docs/simulacion-qa-2026-10-07.md`.
