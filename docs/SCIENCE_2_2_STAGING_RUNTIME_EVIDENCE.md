# Science 2.2: exact-commit CI and read-only staging runtime evidence

## Checkpoints, boundaries and CI

- Staging app ID: `6aefe9d09e2788fc8591c758`. Before-work checkpoint `6af8d0d06c20e22b39d7cc72`, sandbox revision `18cf83fa85d84c228d99ac38ecc3ea0159f80204`.
- GitHub PR #172 exact SHA `533a5f42edcc23cb8052e5b2cccee0d54c8ad2c0`: GitHub Actions run **43641347755 success**.
- GitHub PR #149 exact SHA `00e965bd90e1c303deaceedb956b526b708c3f4b`: GitHub Actions run **43641380449 success**.
- No production writes, deployments, merges, staging athlete reads or backend-function modifications.

## Reconcile #149 with #172

These are **complementary, not duplicate** safeguards:

1. PR #149 `scripts/staging-identity-gate.mjs`, `scripts/assert-preview-build-config.mjs` and `src/lib/app-params.js` verify explicit **declared** staging IDs, HTTPS origin and fail-closed Preview build/runtime identity; it rejects stale URL/localStorage production ID in guarded preview mode. It does **not** attest independent backend data/auth tenancy.
2. PR #172 `base44/shared/stagingIsolationEvidence.ts` requires **independent evidence** of database, auth, function routing, effective origins, temporary-user test-data routing and count provenance. It is a pure acceptance checklist, not a runtime app-ID validator.

**Do not replace the PR #149 runtime identity guard with PR #172's evidence checklist or assume PR #149's green CI proves database isolation.** They should be combined only after a file-level integration review. This branch adds neither PR #149's runtime changes nor any Vercel environment changes.

## New read-only platform observations

- Base44 `GET /api/apps/{app_id}/sandbox/preview-url` reported `sandbox_info.cold_start=false`, a preview URL and a short-lived token. Token was not stored or logged. This indicates sandbox warm status, **not** authenticated browser readiness or test-data isolation.
- Base44 Run Test documentation says the testing agent uses a temporary user against **test data**, not live data, when it starts on the current preview. It also permits an explicit URL, which can be a published page. Prior testing with a published staging URL reached login but did not authenticate; **no proof that the explicit URL preserved test-data routing**.
- Base44 function-log API distinguishes `env=preview` from `env=prod`. Here `prod` means the **published deployment of the staging app ID**, not the separate TrainPaceLab production app.
- A new scoped read-only query returned **nine historical error lines** for `calculateBanisterModel` on published staging between 2026-11-14 08:33 and 10:43 UTC. The error was `TypeError: Cannot destructure property 'durationMinutes' of 'n' as it is undefined` in `_bundled.mjs`. These are evidence that an **older deployed bundle** executed a malformed calculation path; they are not proof that the current fail-closed GitHub handler produced that error.
- Preview logs for `calculateBanisterModel`, `calculateTrainingLoad` and `reviewRestDays` were empty. Published-staging logs for `calculateTrainingLoad` and `reviewRestDays` were empty. Empty logs are **not** evidence of healthy or correctly routed workers. No authoritative deployment revision/route mapping was obtained.
- `base44/functions/calculateBanisterModel/entry.ts` in the GitHub science branch returns POST 503 `LEGACY_CALCULATION_NOT_VALIDATED` and non-POST 405. The historical bundled `durationMinutes` error does not match this fail-closed handler. Previous direct HTTP tests saw original named route 500 while identical source deployed under a fresh temporary name returned expected 405/503. This supports a **legacy deployment mismatch hypothesis**, not a proven platform root cause.

## Regression and remaining gates

Added `functionLogEvidence.ts` and tests requiring an exact app ID and a valid cutoff before counting recent errors. Old log lines are classified as stale; empty log sets are labeled only `NO_RECENT_ERRORS_OBSERVED`. The helper never reports worker health or isolation from logs alone.

Before authenticated acceptance, independently verify: exact preview/published SDK app ID and backend origin; effective database namespace; independent authentication tenant; test-agent temporary-user dev/test data routing; function name → deployed revision mapping; and a reliable non-sensitive zero-write audit. Base44's entity count API is RLS-filtered and reads published app records, so it cannot substitute for a test-database audit.

No athlete data was accessed. Rest writes and unverified science calculations remain disabled. Keep all PRs draft and production untouched.
