# Science 1.7: Base44 staging bundle recovery and acceptance

## Environment and restore points

**Only TrainPaceLab-Staging** app `6aefe9d09e2788fc8591c758` was changed; production `6a504ebe6a5a6d1be058226c` was not modified. Pre-remediation checkpoint: `6af81bfc4bed619db6d279ef`; initial post-remediation checkpoint: `6af81cbc4bf90a2e6302afe9`; additional UTC-label checkpoint: `6af81ce58139508490722bae`.

## Bundle blockers repaired in staging

1. `acceptInvite` and `inviteAthlete` were Python FastAPI placeholders stored as `.ts` files and returned fabricated success without any real database persistence. Replaced with valid Deno handlers returning HTTP 503 `COACH_INVITE_NOT_IMPLEMENTED`. **This intentionally leaves coach invitations unavailable rather than claiming success.** Proper authenticated, transactional invitations remain separate work.
2. `calculateBanisterModel` and `calculateTrainingLoad` imported unsupported `@base44/cloud`. Removed the invalid import and replaced the unverified callable handlers with explicit Deno HTTP 503 fail-closed responses; legacy calculations remain in Git history and dedicated science modules. **Important:** actual staging GET requests still return HTTP 500 `user-exception` for both endpoints, despite the source being accepted. This remains a deployment/runtime blocker, not a verified recovery.
3. `calculateVDOT` imported unsupported `npm:@base44/runtime`. Switched to supported `npm:@base44/sdk@0.8.31`, used `Deno.serve` and added authentication check.
4. The staging Physiology Lab now renders the read-only `RestHistoryReview` for authenticated athlete profiles while preserving its onboarding and loading states.

The staging source edits returned `applied: true` and the staging app status was `ready`. This demonstrates Base44 accepted the source changes, **not** that every function worker is healthy. The two legacy calculation routes still fail at runtime.

## Executed evidence

- In staging sandbox: `npm run typecheck` **passed**, `npm test` **199/199 passed** across 30 files, and `npm run build` **passed**. This test count predates the additional GitHub-only bundle contract tests.
- Actual staging URL `https://train-pace-lab-copy-8591c758.base44.app/api/functions/reviewRestDays` returned **GET 405** with `Method not allowed`, confirming the deployed handler is reachable and enforces method validation. VDOT also returned GET 405; coach invitation routes returned GET 401 Unauthorized; legacy calculation routes returned GET 500 `user-exception` (unresolved).
- Unauthenticated POST to the same URL returned **500** with `This app is private, You do not have access to this app`. This is a Base44 access boundary response, **not** an authenticated application success or a demonstrated HTTP 401.
- No test athlete account/session or safe authenticated backend fixture was available. Therefore no real authenticated preview, RLS, duplicate-workout, rest-conflict or complete recording-to-dashboard end-to-end test has been executed.
- The staging UI is wired and builds; interactive logged-in visual acceptance remains pending.

## Scientific integrity and follow-up

The read-only rest confirmation blocker and non-mutating CTL/ATL recalculation guard from #148 remain in place. Do not turn them off to make a demo work. The legacy Banister/load endpoints require separate provenance and mathematical validation. Coach invite functions require real authenticated persistence and token/expiry handling before re-enabling.

## Merge and release gates

PR dependency chain: #142 → #145 → #146 → #148 → this PR. Merge only after reviewing combined changes; avoid exposing unsafe #145 alone. Verify new GitHub CI on this branch, run authenticated staging tests with an isolated test athlete and no production data, validate real UI accessibility and endpoint authorization, then approve deployment separately. Production untouched.
