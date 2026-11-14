# TrainPaceLab — Atomic MVP Delivery Backlog

**Updated:** 2026-11-12 (Australia/Brisbane). **Canonical repository:** `cjmurphy73-44/runpacelabcurrent`; protected `main`. **Current source baseline:** `4515b88594df6e1458670693d07cf8e74e7ed162` (PR #31). **Base44 production:** app `6a504ebe6a5a6d1be058226c`, latest reported checkpoint source `3f386d4` (not proof of current source). 

This file is the **single execution queue**, not a claim that beta readiness is complete. `src/PRODUCTION_ROADMAP.md` contains earlier phases and some obsolete status assertions; `src/BETA_READINESS_ROADMAP.md` is the release acceptance companion. Current evidence wins. Work **one atomic task per PR**, with explicit source-path scope, tests, and a disposition of `merged / awaiting CI / blocked / verified live`. Do not call a code merge a production release.

## Hard rules

- Athlete data, OAuth tokens, health records, payment records and production connections are not test fixtures. Use synthetic unit tests or isolated test accounts. Never weaken athlete RLS.
- Protect IP: keep proprietary mathematical derivations out of shipped client JS; use the deterministic engine for calculations, AI only for narrative. No proprietary detail in public roadmap or logs.
- Preserve **Odysseus** exactly; do not delete, relocate, reset, rewrite history, or alter its gitlink without independently verified preservation and explicit approval.
- No direct push to protected `main`, force push, publishing stale Base44 checkpoints, merging before `validate` and Vercel checks pass, or bypassing review.
- Base44 Builder is for editor-only authenticated/publishing functions that GitHub/API tools cannot safely perform; conserve Builder credits.
- For every task: inventory existing code and related PRs; change smallest coherent surface; add negative-case tests; run typecheck/tests/build/source-map guard; PR and CI; merge only when green; record exact SHA; production/browser validation must be separately marked.

## Blocker and workstream index

| ID | Priority | State | Atomic task and acceptance |
|---|---|---|---|
| **REL-001** | P0 | **Blocked: platform** | Reconcile Base44 GitHub two-way sync with protected `main` without bypass or direct push. Support escalation and reproduction [#24](https://github.com/cjmurphy73-44/runpacelabcurrent/issues/24). Accept only when new checkpoint reports verified source and main remains protected. |
| **REL-002** | P0 | Ready after REL-001 | Verify exact published source: capture GitHub SHA, Base44 checkpoint ID, deployment time, production asset identifiers, UI evidence, post-deploy smoke. No rollout based solely on successful Vercel build. |
| **REL-003** | P0 | Ready after REL-002 | Published smoke: sign-in, onboarding, import, plan load, coach hold, navigation and error handling on production at 390px; preserve evidence and block release on unknown critical states. |
| **DOC-001** | P0 | **In progress, this PR** | Establish reconciled atomic backlog, canonical release rules and known blocker links. Acceptance: reviewed, merged documentation checked against GitHub SHA and Base44 state. |
| **COR-006** | P0 | Next eligible code task | COROS retry idempotency: same provider activity imported twice or retried after uncertain bulk write must produce one session; add deterministic identity/provenance when available and test ambiguous partial commits, same-day distinct sessions. |
| **COR-007** | P0 | In progress/partial | Verify COROS original FIT download, decoding and sample retention end-to-end with isolated account; measure records found, FIT verified, summary-only, failed/uncertain, retry. No proof from MCP summary alone. |
| **GAR-003** | P0 | Ready | Garmin original recording completeness and retry parity: decoded physiological stream versus summary fallback, dedup and partial-write diagnostics, no bogus zone time. Test callback/webhook and historical paths independently. |
| **ING-007** | P0 | Ready | Bulk importer reconcile uncertain partial persistence: count confirmed writes only, classify duplicate skips vs failures and verify absence of duplicate on retried batch. PR #29 addressed response truthfulness, not database-level exactly-once guarantees. |
| **SCI-005** | P0 | Ready | Reconcile measured/estimated TRIMP, rTSS and TSS provenance across ingestion routes; ensure all fallbacks are labelled and mathematically defensible; golden cases, zero/missing channels and stream coverage. |
| **SCI-006** | P0 | Ready | Add benchmark tests for EWMA 42/7, Banister model, pace/HR/power zones, stream timing and readiness no-data paths; assert deterministic reproducibility without disclosing private coefficients. |
| **SEC-005** | P0 | Blocked: isolated account | Two-account RLS test for athlete profile, sessions, coach messages, connections, token tables and coach assignments; demonstrate cross-account read/write rejection and admin exception only where intended. |
| **BILL-003** | P0 | Blocked: isolated checkout | Stripe webhook idempotency and entitlement transition tests: checkout, retry, duplicate events, cancelled/past_due; confirm entitlement by server authority, not client value. |
| **UX-PLAN-004** | P1 | Code merged; live unverified | Coach hold accessibility and separated historic/current status; source PR #27. Verify published behavior and original screenshot contradiction once REL-002 passes; related [#26](https://github.com/cjmurphy73-44/runpacelabcurrent/issues/26). |
| **UX-005** | P1 | Ready | Mobile 320/375/390 layout audit: nav, today card, coach hold and plan actions; fix one reproducible overflow/keyboard/touch issue per PR. |
| **UX-006** | P1 | Ready | Dashboard hierarchy: one primary current status, readiness provenance, coach briefing and one next action; avoid competing numbers, loading flashes and silent failures. |
| **UX-007** | P1 | Ready | Onboarding ends with real data: connect or upload or log, recovery to first plan, honest provider availability, no dead-end route. |
| **PERF-002** | P1 | Ready | Large JS bundle performance: measure before/after cold loads, split expensive imports by route, track performance on 390px mobile, avoid shifting sensitive science into client. |
| **OBS-003** | P1 | Ready | Provider sync audit ledger: last attempted/succeeded, summary-only, FIT-verified, partial writes, errors and retry link; UI must not translate unknown into success. |
| **DES-002** | P1 | Ready | Real-scene landing imagery and meaningful application screenshots, consistent logo/icon/favicon/OG. Avoid generated people, misleading metrics or screenshots that expose data. |
| **WEB-003** | P1 | Ready | Landing copy, accessibility, SEO canonical/domain, pricing and signup CTA coherence; verify production metadata on the real domain. |
| **QA-004** | P1 | Blocked: authenticated environment | Isolated end-to-end athlete journey on staging: onboarding → wearable/upload → measured vs estimated load → coach state → plan → Stripe test checkout, recording evidence not claims. |
| **LEGAL-002** | P1 | External review | Privacy/terms/refund health-data and Australian subscription language review before general release. |
| **OPS-003** | P2 | Ready | Monthly dependency, audit-log, secrets exposure, token-refresh and rate-limit review; eliminate duplicate dead UI/components after verification. |

## Evidence of work already merged

- **#21/#23:** recovered Base44 source and protected CI; `validate` runs TypeScript, tests, production build and source-map checks.
- **#25/#27:** coach hold date safeguards, accessible clearance with verified persistence, shared UI state; live release not verified.
- **#28:** frontend/backend dense recording gate; deterministic invalid-telemetry rejection; mobile provider health uncertainty.
- **#29:** bulk ingest partial failure reporting and honest import UI.
- **#30:** dashboard load provenance (`stream`, `summary`, `unverified`).
- **#31:** COROS original FIT/summary-only reporting and partial-write diagnostics. Still not a demonstration of real account or exactly-once retry semantics.

## Delivery order and gates

1. **Release lane, external block:** REL-001 → REL-002 → REL-003. Do not block independent source improvements while Base44 support works.
2. **Correctness lane:** COR-006 → COR-007 → GAR-003 → ING-007 → SCI-005 → SCI-006; then live provider acceptance.
3. **Security/payment lane:** SEC-005 and BILL-003 before any broad beta invitations; no production-data tests.
4. **Product lane:** UX-PLAN-004 → UX-005 → UX-006 → UX-007 → PERF-002 → OBS-003 → DES-002 → WEB-003.
5. **Launch gate:** QA-004 and LEGAL-002, then a small beta cohort and monitored incident/rollback procedures. Launch marketing only after security, payment and data-flow acceptance.

## Per-PR completion template

- **Task ID / source revision:** …
- **Why / observed failure:** …
- **Changed paths:** …
- **Deterministic positive and negative tests:** …
- **CI / Vercel / build / source-map results:** …
- **Security, data and IP review:** …
- **GitHub PR / merged SHA:** …
- **Base44 deployment SHA / checkpoint / timestamp:** `NOT PUBLISHED` unless verified.
- **Staging/live evidence and open blockers:** …

## 2026-11-14 Planned/actual explicit matching (PR #123)

- Audit found `usePlannedActualReconciliation.load()` automatically mutated `TrainingPlanSession.status` and `WorkoutSession.training_plan_session_id` on high-confidence algorithmic matches. Read-only screen load must not commit inferred completion.
- Changed load to produce reviewable candidates without any automatic link writes; added one-to-one candidate guard to explicit confirmation, plus five synthetic tests. Draft PR #123; no deployment or executed CI.
- High-priority follow-up: replace client-side two-write confirmation with a server-authorized, idempotent, race-safe operation. Recheck athlete ownership, session status and existing links on the server, and address partial writes. Preserve manual mark-complete as explicitly user initiated and distinguish it from a verified device workout.

### 2026-11-14 fail-closed confirmation follow-up (PR #123)

- Disabled the existing two-write client confirmation path until an atomic server-side operation is verified. This is an intentional temporary functionality gate; the UI must explain that linking is unavailable rather than claim a successful completion.
- Corrected adaptive replan toast logic to require explicit backend `success: true` before claiming confirmation. Exceptions now report unverified failure, not a background success.
- Coordinate with draft PR #126, which provides read-only preflight only. Neither PR establishes a transactional link. Before release, implement a verified conditional/transactional server commit and test concurrent confirmation, retries, partial writes, and RLS ownership.
