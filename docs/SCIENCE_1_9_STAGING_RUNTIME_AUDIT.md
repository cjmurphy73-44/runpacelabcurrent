# Science 1.9: read-only staging runtime and isolation audit

Date: 2026-11-15. Scope: staging app `6aefe9d09e2788fc8591c758`, GitHub draft PR #193 stacked on #152. **No release approval.**

## Exact-head evidence
- PR #193 prior head `a1517e285631c1849de93e39b228d69bdb85676a`: GitHub Actions run #43655772064 completed successfully.
- Current branch adds a stricter offline legacy-calculation no-write regression; new head requires a new CI result.
- Staging checkpoint before inspection: `6af8f5d4258c7d4df30c7137` (`63c5aff20dc8d4ca3658841209ec3f9bd1c24f29`).
- Staging sandbox: typecheck 0, Vitest 199/199, Node contract tests 57/57, build 0. These runs preceded the new GitHub-only regression.

## Runtime observations
- Unauthenticated, read-only GET to `/api/functions/calculateBanisterModel` and `/api/functions/calculateTrainingLoad` returned HTTP 500 `user-exception` after prior explicit same-source redeployment.
- `reviewRestDays` and `calculateVDOT` GET returned HTTP 405.
- Base44 platform `GET /api/apps/{app_id}/functions-mgmt/{function_name}/logs?env=preview` returned empty lists for both failing calculators. **No worker stack trace obtained.**
- Base44 `GET /api/apps/{app_id}/backend-functions` response was truncated by the connector (24,024 characters) before these functions could be identified. This is **not** authoritative deployed-code or deployed-version verification.
- A source file and successful redeploy response do not prove the running worker serves that version. No root cause established; do not make speculative calculation changes or re-enable unverified outputs.

## Isolation gate
- Base44 staging and production are distinct declared app IDs; this does not prove database, authentication, function routing or secrets isolation.
- Related draft PR #149 and its issue comments report missing authoritative effective Vercel Preview environment and exact-SHA READY deployment evidence. No independently attested staging API origin.
- `dev_environment_enabled` and tenant isolation could not be authoritatively established from the truncated Base44 app response. No test athlete created; no authenticated E2E, backend write, or production call.
- Preview stays fail-closed. Rest confirmation and persistent CTL/ATL writes remain disabled.

## Next evidence required
1. Obtain targeted, untruncated Base44 deployed-function source/version metadata and invocation startup logs (platform support if needed).
2. Obtain Base44-confirmed staging database, auth, function and secrets isolation plus exact effective SDK/API origin and Vercel Preview provenance.
3. After verified isolation and separately authorized synthetic test identity, test authenticated ownership denial and read-only rest/Physiology flows; keep all mutation paths disabled.
4. Recheck exact-head GitHub CI and review concurrent PRs before any merge or release.
