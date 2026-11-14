# Science 1.8: staging runtime and authenticated acceptance

## Boundaries and checkpoints

Staging Base44 app: `6aefe9d09e2788fc8591c758`; production app `6a504ebe6a5a6d1be058226c` untouched. Pre-change checkpoint: `6af830113beefb2e7d062bbc`.

The integration branch stacks on #152, which stacks on #148, #146, #145 and #142. Do not merge or deploy production without an explicit review of the combined diff.

## CI and source validation

- PR #152 latest commit `0d7fc7fda79a4277a99f6facbde81359832fc2a3` passed GitHub Actions run `43576602691`.
- Staging sandbox after rest-review changes: `npm run typecheck` passed; `npm test` 199/199 across 30 files passed; `npm run build` passed. New GitHub-only policy tests are not included in this staging count.
- Added pure `classifyRestReviewRequest` policy and regression tests for date validity, unsupported actions, no rest writes, and ownership guard ordering.
- Removed SDK/internal exception details from rest-review HTTP errors. Unverified days remain unverified and rest confirmation always returns 409.

## Runtime investigation (no invented root cause)

- Base44 `GET /api/apps/{app_id}/functions-mgmt/{function_name}/logs` was queried for `calculateTrainingLoad`, `calculateBanisterModel`, and `reviewRestDays`. Both error-filtered preview and unfiltered calculation queries returned **empty arrays**. Empty logs do not prove that a worker is healthy or reveal the exception.
- A direct staging-only `coding/redeploy-function/calculateTrainingLoad` succeeded. A second redeploy with a supported SDK import and authenticated Deno handler also succeeded, yet GET and POST on both preview-sandbox and the published staging host still returned **500 user-exception**.
- `calculateBanisterModel` also still returns **500 user-exception**. There is no confirmed root cause. These are unresolved runtime or deployment-route problems, not successful fixes.
- `reviewRestDays` and `calculateVDOT` GET returned 405, demonstrating those handlers are reachable and method-guarded.
- The staging app's published host and the test-agent preview use distinct URLs. Do not treat published-host requests as proof of the preview's current function code.
- Do not re-enable the unvalidated legacy Banister or load algorithms to silence the 500s.

## Isolated browser acceptance

A Base44 test-agent flow `6af8301500eb0813a589d23c` was created for **read-only** Physiology Lab testing as a temporary `user` in the preview's `base44_data_env=dev`. Execution `6af8301b8d0c754720041f93` was started. It must not create, update or delete athlete or workout records. Inspect its final status and report before claiming an authenticated pass. No authenticated app-user credentials were generated, copied, or exposed by this work.

Staging main entity counts inspected separately as a guardrail: AthleteProfile 7, WorkoutSession 0, DailyMetrics 6. These are not a substitute for test-environment before/after counts or proof of a transactionally consistent snapshot.

## Outstanding gates

1. Read the browser test result and inspect any failure without altering production or real athlete data.
2. Obtain startup/worker diagnostics for both legacy 500s (logs currently empty), or escalate with timestamps, deployment SHA and request IDs.
3. Verify authenticated `reviewRestDays` POST, athlete ownership 403, rest confirmation 409, no writes, pagination and mixed-unit handling against an isolated test athlete.
4. Verify athlete-local date semantics and provider completeness before enabling persistent CTL/ATL calculations.
5. Keep the science endpoints fail-closed and the PR draft until staging end-to-end acceptance is evidenced.
