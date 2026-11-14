# Science 2.1: Base44 staging isolation and count-drift investigation

## Safety and provenance

Read-only platform API investigation for separate TrainPaceLab-Staging app `6aefe9d09e2788fc8591c758`. Before-work Base44 checkpoint `6af8cd4537541b205ad3e56b` at sandbox revision `18cf83fa85d84c228d99ac38ecc3ea0159f80204`. No entity create, update, delete, deploy, merge, or production operations were requested. Draft PR #163 and its dependencies remain unmerged. Do not expose credentials or athlete records.

## Correcting the count-drift interpretation

- Science 1.9 reported visible counts `AthleteProfile=7, WorkoutSession=0, DailyMetrics=6`. Science 2.0 reported `4, 3, 3`, repeated twice. A Science 2.1 read-only check returned `WorkoutSession=3`.
- Base44's **Get entity record count** API explicitly says it counts **production records visible to the calling credential after RLS**, and operates as the caller's app user. The response exposes `count`, but does not identify the exact database, effective RLS policy, actor identity or test-data namespace. Therefore differences between these snapshots do **not** establish record deletion, creation, write attribution, or data corruption. Nor does a matching count prove zero writes.
- The separate **Get data version history status** returned `state=needs_upgrade`, `retention_days=null`, `history_available_since=null`. Historical change attribution is unavailable through that feature; do not upgrade plans or enable it without approval.
- **No records were opened**, including athlete IDs, workout content or user identities. There is no verified immutable before/after audit trail for the count changes. Treat the discrepancy as unexplained, with RLS/credential visibility a documented confounder.

## Identity and routing evidence

| Boundary | Verified | Limitation |
|---|---|---|
| Separate staging app ID | Yes, staging API scoped to `6aefe9d09e2788fc8591c758` | Different app ID alone does not prove independent database, auth tenant or functions |
| Sandbox availability | Yes, `get_app_status` returned ready and version `18cf83fa85d84c228d99ac38ecc3ea0159f80204` | Readiness does not establish browser SPA boot |
| Preview access | Anonymous preview-sandbox GET returned 401 in Science 2.0 | A short-lived preview token is required; no authenticated preview acceptance |
| Published staging frontend | Published staging host returned 200 HTML and a browser test reached its login screen | It did not authenticate, and a published URL is not evidence of dev/test database routing |
| Testing-agent data | Base44 Run Test documentation says its agent signs in as a temporary test user and uses test data, not live data | Two preview runs failed at startup. A run with an explicit published staging URL stopped at login; the exact effective data routing under URL override was not proven |
| Effective SDK backend | `src/api/base44Client.js` passes `appId`, `appBaseUrl`, `functionsVersion`, and `serverUrl: ''` | `src/lib/app-params.js` has a hardcoded published app ID fallback and accepts URL/localStorage overrides; exact staging build/runtime values were not independently observed |
| Authentication tenant | No | Auth configuration/issuer/session tenancy not independently proven |
| Database namespace | No | Production-count API is not the test database; no independent test namespace evidence |
| Function deployment | No | Prior minimal and cloned Banister probes worked, original legacy function names still returned 500. The backend-function listing was truncated by connector; no complete per-function metadata comparison |
| Data mutation audit | No | Entity version history needs upgrade; no before/after transactional test-data snapshots |

**Do not infer independent isolation from the published hostname, staging app label, successful GitHub CI, function probe, or count API.** Separate Base44 staging and production app IDs are necessary but not sufficient.

## New regression contract

`base44/shared/stagingIsolationEvidence.ts` provides a pure fail-closed gate. It requires **separately verified** app IDs, effective backend origins, independent database, auth tenant, function routing, authenticated dev-data browser path and stable read-only count provenance. Missing/unknown flags are rejection, not implicit success. Unit tests exercise every missing boundary, unknown evidence and the currently risky published-ID fallback. This is a checklist evaluator, not an automatic attestation or a change to live routing.

## Remaining blockers and next steps

1. Use a supported read-only Base44 platform API to prove the exact effective database, auth tenant and function deployment for **both** staging preview and published staging. No credentials or athlete records should be fetched.
2. Verify effective SDK app ID/base URL for the exact branch and deployment, avoiding the existing published-ID fallback. Coordinate with draft PR #149, which already implements a staging identity acceptance gate; do not duplicate or merge it blindly.
3. Obtain the Base44 preview testing-agent startup/authentication diagnosis. Do not supply a published URL as a shortcut to test-data isolation without platform evidence.
4. Request platform diagnostics for the original legacy calculation function names and deployment metadata. Keep their fail-closed responses and do not delete/recreate them.
5. Only after independent isolation proof, run temporary-user authenticated read-only tests for owned vs foreign athlete, unknown days, bounded pagination, provenance and zero-write deltas in the **same verified test database**.

Rest confirmation and unvalidated calculations remain disabled. Production remains untouched.
