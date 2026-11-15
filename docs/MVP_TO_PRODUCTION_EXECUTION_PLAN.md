# TrainPaceLab — MVP to production execution gates

**Planning baseline:** 2026-11-11  
**Status:** Proposed plan; not a release approval.  
**Scope:** Frontend, backend, UI/UX, assets, integrations, security, billing, QA, observability, staging and launch.  
**Canonical existing backlog:** [`ROADMAP.md`](../ROADMAP.md) (209 numbered jobs). This plan prioritizes gates and adds an atomic execution queue; it does **not** mark legacy jobs complete without evidence.

## Operating rules

1. **No production changes by default.** Work on short-lived branches and draft PRs. CI success is not staging acceptance; staging acceptance is not permission to deploy production. Production releases need explicit owner approval, rollback readiness and a release record.
2. **Protect Odysseus independently.** Inventory nested Git/submodule references and preserve local files, repository history and backups. Never remove, move, reset, merge a gitlink removal, or delete the project without verified preservation and explicit approval. Keep unrelated Odysseus changes out of TPL PRs.
3. **One eligible atomic task per engineering run**, ideally <=45 minutes. First reconcile code, open PRs and existing job IDs; then implement one scoped change, test it, inspect the diff, push to a draft PR and record evidence/blockers.
4. **Synthetic staging accounts and data only** for authentication, athlete isolation and write tests. Do not copy production athlete data or tokens. No live charges or outbound notifications during staging tests. Treat health/recovery data as sensitive.
5. Do not expose secret values, session tokens or user records in logs, PR descriptions or chat. Record secret **names/presence** only. Base44 source-in-sandbox is not proof that a backend function is deployed or enabled.
6. Any task blocked by credentials, provider approval, deployment limits or manual UI acceptance stays **blocked** with a named dependency; continue on a safe independent task rather than bypassing the gate.

## Verified/known baseline (evidence is scoped)

- GitHub repo: `cjmurphy73-44/runpacelabcurrent`; Vercel project: `runpacelabcurrent`.
- Base44 authenticated connector independently lists **TrainPaceLab-Staging** (`6aefe9d09e2788fc8591c758`) and **TrainPaceLab** (`6a504ebe6a5a6d1be058226c`). Treat production as read-only unless separately approved.
- Staging settings, **owner-confirmed**: email/password ON, MFA OFF, `TPL_ENVIRONMENT=staging`, and `WEBHOOK_SYNC_SECRET` differs from production. Base44's read-only secret-name API lists exactly `TPL_ENVIRONMENT` and `WEBHOOK_SYNC_SECRET`.
- Base44 staging connector inspection: GitHub API and Airtable are **disconnected**; no other returned OAuth connector is active. This does not exclude custom HTTP integrations, external webhook senders or workspace-level connections.
- Base44 staging code sandbox lists **50 function directories**. The deployed-backend-functions API response was truncated, so deployed/active functions remain **unverified**.
- Draft PR **#13** contains fail-closed Vercel Preview staging config and a diagnostic page. Prior CI passed 201 tests/28 files on an earlier code commit. A user-pasted browser 403 is **reported, not independently reproduced**; synthetic login, session restoration, API permissions and data isolation remain unverified.
- Existing draft PRs to reconcile: **#9** Garmin/COROS status UX (stacked on #8), **#10** COROS FIT/Today Session reliability, **#12** dashboard load snapshot, **#13** Preview isolation. None is a release approval.
- The existing `ROADMAP.md` describes production billing and known defects, but its claims and checkboxes require fresh verification. `docs/AUTONOMOUS_DELIVERY.md` was not present at the checked ref on this date; do not assume its instructions are available.

## Release gates (must all pass before public promotion)

| Gate | Acceptance evidence | Current state |
| --- | --- | --- |
| G0: Branch & change control | PR inventory, no unrelated gitlink changes, CI green, reviewed diff | Partial |
| G1: Staging isolation | Exact staging backend, synthetic session, independent tenant/athlete RLS checks, no production writes | **Blocked** |
| G2: Core athlete journeys | Fresh onboarding; with/without-plan; workout ingest; physiology/load; coaching; mobile smoke tests | Not accepted |
| G3: Billing & integration safety | Stripe test-mode round trip, webhook signatures/idempotency, entitlements, truthful wearable statuses, COROS test evidence | Not accepted |
| G4: Security, privacy & operations | Permission/ownership review, secret boundaries, rate limits, errors/logging, backups, rollback and incident response | Not accepted |
| G5: Launch quality | Mobile/accessibility/performance/branding review, release candidate, staged rollout and owner sign-off | Not accepted |

## Atomic queue (priority order; 1 task per run)

**P0 — isolate and unlock staging**

- [x] **TPL-001** Reconcile open PRs #4–#14 with `main`; record overlap, dependency order, CI and whether any diff touches Odysseus. *Done:* see [PR reconciliation evidence](PR_RECONCILIATION_2026-11-11.md). **Critical block:** #5 and inherited #4/#6/#7/#8/#9 remove the Odysseus gitlink relative to main; do not merge. #14's doc-only CI fails due to baseline `athleteState.ts` TS2367. No merges performed.
- [ ] **TPL-002** Audit staging Base44 function source and runtime dependency names for Stripe, COROS, Garmin, Airtable, outbound fetch and webhook routes. *Done when:* function-to-secret/external-service matrix exists without secret values; deployed status labeled unknown where not verifiable.
- [ ] **TPL-003** Audit staging entity schemas and RLS for `AthleteProfile`, `WorkoutSession`, `DailyMetrics`, `LabResult`, `Subscription`, `User`. *Done when:* read/create/update/delete rule matrix, service-role bypass inventory and concrete tests are documented; no real athlete records read.
- [ ] **TPL-004** Validate Vercel Preview exact staging identity, routing, CORS and SDK request origin in an independent browser session. *Done when:* dated request/response evidence is recorded without tokens.
- [ ] **TPL-005** Create/authorize synthetic staging test identities **only after** TPL-002/003/004 are reviewed. *Done when:* synthetic email/password login, logout, hard refresh and session rehydration pass; MFA is off as configured.
- [ ] **TPL-006** Test two-account athlete isolation in staging: own-record read/write, cross-account read/write denied, service-role boundaries, and production nonappearance check via authorized read-only means. *Done when:* negative tests and cleanup evidence recorded.
- [ ] **TPL-007** Resolve confirmed auth or RLS defects with regression tests. *Done when:* root cause, fix, CI and staging retest evidence; no speculative production changes.

**P1 — make the core product trustworthy**

- [ ] **TPL-008** Reproduce `/plan` with/without a plan and on refresh; fix only confirmed 500/null-shape faults. *Done when:* all three journeys pass.
- [ ] **TPL-009** Verify onboarding, athlete linkage, manual workout, import failure/retry and dashboard zero-data state. *Done when:* documented synthetic end-to-end smoke run.
- [ ] **TPL-010** Validate TRIMP/rTSS, CTL/ATL/TSB, VDOT and recovery math against deterministic fixtures, including missing/partial data. *Done when:* numeric tolerance tests and UI empty states pass.
- [ ] **TPL-011** Verify training-plan generation, safe plan updates, AI coach and failure recovery with bounded staging fixtures. *Done when:* successful and failure paths recorded.
- [ ] **TPL-012** Review widget error boundaries, API adapter contracts, retry/backoff and telemetry. *Done when:* no silent success on failed/empty integration responses.

**P2 — mobile UI/UX and visual identity**

- [ ] **TPL-013** Audit mobile routes at 320px, 390px, 768px and desktop; prioritize iPhone navigation and Physiology Lab access. *Done when:* screenshots and tap-target/accessibility checklist pass.
- [ ] **TPL-014** Establish a consistent UI design system: typography, spacing, color contrast, chart semantics, loading/empty/error states. *Done when:* representative dashboard/onboarding/plan screens reviewed.
- [ ] **TPL-015** Inventory logos, icons, imagery, app/favicon/social assets and licenses; prepare revised assets and responsive formats. *Done when:* approved asset set, source/license inventory, performance checks and visual QA are complete.
- [ ] **TPL-016** Integrate approved branding across landing, onboarding, dashboard, email/share surfaces and mobile; avoid unverified provider claims. *Done when:* cross-device screenshot diff and accessibility pass.

**P3 — integrations, billing and business flows**

- [ ] **TPL-017** Verify COROS connection, token refresh, workout/FIT import, dedup, recovery metrics and partial-failure messaging with approved staging test data. *Done when:* provider evidence and retry tests pass.
- [ ] **TPL-018** Review Garmin/Strava/Oura/WHOOP/Polar catalog statuses against tested reality; gate unsupported actions. *Done when:* UI claims match proven functionality.
- [ ] **TPL-019** Audit Stripe checkout, webhook signatures/idempotency, plan IDs, cancellation, subscription entitlements and test/live separation. *Done when:* synthetic test-mode purchase/cancel round trip and no live charges; production keys never used in staging.
- [ ] **TPL-020** Verify access codes, coach/athlete roles, invitations, roster privacy and account deletion. *Done when:* role-boundary tests and lifecycle evidence pass.

**P4 — engineering and release operations**

- [ ] **TPL-021** Build a CI matrix: typecheck, lint, unit, integration, RLS/security, production build, mobile smoke and Preview acceptance. *Done when:* required checks are documented and consistently green.
- [ ] **TPL-022** Audit secrets, function availability/limits, dependency risk, error monitoring, rate limiting, data retention and recovery. *Done when:* risks have owners and mitigations; no sensitive logs.
- [ ] **TPL-023** Write release/rollback runbook with production configuration comparison, database migration safety, backups, smoke tests and incident contacts. *Done when:* dry-run succeeds without touching production.
- [ ] **TPL-024** Prepare a staging release candidate, collect G0–G5 evidence, run limited beta acceptance and request explicit production approval. *Done when:* signed release checklist, rollback plan and go/no-go decision exist.

## PR and promotion policy

- Merge order is **not assumed**: resolve stacked dependencies and review conflicts first. Draft PRs #9/#10/#12/#13 stay draft until their individual gates pass.
- Base44 staging edits and GitHub source changes must be reconciled so that source-of-truth drift cannot silently overwrite the deployed app.
- Never promote Preview/staging code, change billing mode, alter production secrets, send live webhooks or deploy production as a side effect of a planning task.
- After each atomic run, record: task ID, branch/PR, files changed, tests and exact counts, staging evidence, blockers, risk and next task.
