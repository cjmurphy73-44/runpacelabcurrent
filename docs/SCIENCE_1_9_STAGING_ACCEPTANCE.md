# Science 1.9: staging runtime, browser acceptance and fail-closed authorization

## Isolation and checkpoints

Base44 staging app `6aefe9d09e2788fc8591c758` only. Pre-work checkpoint `6af83a8ecaaea8bb6b1a692c`. Post-work checkpoint `6af83bb9b97111a6dc6403de`. Production untouched. The integration branch stacks on draft #158, #152, #148, #146, #145 and #142; do not merge or deploy.

## Browser test: what actually happened

- First read-only temporary-user run `6af8301b8d0c754720041f93`: **failed**, `failure_reason=platform`, `goal_accomplished=false`, `credits_charged=0`. The Base44 preview remained on “Preview is starting up” through a reload, wait and direct /Physiology navigation. No app screen, authenticated review request or test-athlete records were reached.
- Called the platform's sandbox preview URL operation; it returned a preview URL with `cold_start=false` and a preview token. **Do not commit or disclose the token.**
- Retried the same read-only flow as `6af83aaf0371c3162a581d4b`: **also failed**, `failure_reason=platform`, `goal_accomplished=false`, `credits_charged=0`. The preview stayed on “Preview is starting up” for approximately 2.5 minutes across two reloads. The testing agent reported zero data changes. **No authenticated Physiology Lab acceptance was achieved.**
- Staging main entity counts checked after the work: AthleteProfile 7, WorkoutSession 0, DailyMetrics 6 (unchanged from Science 1.8 baseline). These counts do not establish dev test-data before/after state. No real athlete data or credentials were used. The test-agent API states its temporary user operates against dev/test data, not live data.

## HTTP and function deployment diagnostics

- Before patch: anonymous POST `reviewRestDays` returned 500 `REST_REVIEW_UNAVAILABLE` because `base44.auth.me()` threw on the private app. After changing to `base44.auth.me().catch(() => null)`, anonymous POST returned **401 Unauthorized**, and GET still returned **405 Method not allowed**. This fixes the anonymous authentication failure mode without weakening athlete ownership checks.
- Direct read-only test of the new staging-only `science19WorkerProbe` function returned **200** with static JSON. This proves the staging function runtime can serve a newly deployed minimal function.
- A new staging-only `science19LegacyProbe` deployed with the **same source** as the existing fail-closed `calculateBanisterModel` handler returned **GET 405 and POST 503**. The original `calculateBanisterModel` still returned **500 user-exception** for GET and POST even after redeploying unchanged code. `calculateTrainingLoad` also still returned 500.
- These observations strongly localize the failure to the legacy function deployments/routes or their metadata, rather than a general inability to execute the Deno source. The precise platform root cause is **not established**; function logs were empty in the prior investigation. Do not delete/recreate the existing functions without checking references, workflows and restoration procedures.
- Both temporary diagnostic functions were removed via the staging-only backend-functions delete API after testing. Their source files may remain in the sandbox; no production function was modified.

## Tests and remaining gates

- Regression assertion now requires the rest review to catch rejected `auth.me()` and return HTTP 401.
- Existing unit tests cover the pure rest policy, invalid/oversized/future UTC dates, action rejection, no rest writes, pagination overlaps and bounded reads, and ownership-check ordering. **These are not a substitute for authenticated HTTP E2E.**
- Staging sandbox `npm run typecheck` and `npm run build` passed. The staging sandbox's `npm test` ran 199 passing tests but had one additional suite-load failure in `tests/staging-backend-origin.test.mjs` (`new URL(..., import.meta.url)` was not a file URL in this sandbox). This is distinct from an assertion failure in the science code. GitHub CI must be used to verify the actual branch tests. The first PR #160 workflow run was cancelled when a newer commit superseded it; the latest run is tracked separately.
- Still required: authenticated temporary-user Physiology Lab browser acceptance; owned vs foreign athlete 403, unknown-day provenance, pagination, and before/after test-data write counts; athlete-local date mapping; safe handling of legacy function deployments.

No scientific outputs or CTL/ATL history were fabricated or recalculated.
