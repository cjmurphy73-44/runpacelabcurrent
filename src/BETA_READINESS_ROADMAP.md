# TrainPaceLab — Beta Readiness Roadmap

_A risk-first, pass/fail verification plan for the staged external beta._
_Status legend: ✅ pass · ❌ fail · 🟡 unverified · ⛔ blocked. An item stays 🟡 until fresh runtime evidence is recorded._

The app is published at `https://trainpacelab.base44.app` and accepts real Stripe payments. This roadmap is the **verification** layer that sits on top of `PRODUCTION_ROADMAP.md`: it does not re-implement anything — it proves each area works for an external tester, or marks it unverified. Phases are ordered by launch risk; no phase may be marked done while a 🔴 item inside it is ❌ or 🟡.

Evidence goes in the **Evidence** column of each checklist (route, date, tester, device, and a one-line observed outcome). Source inspection alone is never a pass. Preview/browser limitations are recorded as 🟡 unverified, not as ✅.

> **Follow-up (2026-11-15):** Previous exact head `5438849` passed CI run `43657485336`. Additional offline profile-retention tests now prevent `AthleteProfile` deletion before dependent entity cleanup. Remaining safety gap: if profile deletion succeeds but final `User.delete` fails, retry linkage may be lost; durable recovery and file purging still require design and staging proof. The platform's asset-media-library deletion endpoint is not verified as private athlete-upload file deletion.

> **Recovery-journal checkpoint (2026-11-15):** A draft admin-only `AccountDeletionRecovery` entity and service-role persistence/retry path now protect the athlete-ID deletion scope against profile loss. Earlier exact-head CI `d44d937` passed run `43657768435`, but the new work requires its own CI and staging acceptance. Runtime entity deployment, concurrency/uniqueness, recovery-record retention and private file purge remain **unverified**. Read-only production security scan reports `out_of_date`; staging scan reports `none`, neither constitutes a passing security gate.

> **2026-11-15 concurrency follow-up:** A second scoped read now rejects missing, duplicate or changed account-deletion recovery journals before destructive cleanup, with four new offline tests. This is **not atomic concurrency protection**; a second writer may race after the read. Operator journal reconciliation, private-file purging, fresh security scan and isolated staging execution remain unverified P0 blockers. Previous head `7279f9f` passed CI; the latest head requires independent verification.

> **2026-11-15 retry scope update:** Prior exact-head CI `3ab3fc0` passed run `43658204648`. Draft PR #195 now rejects reuse of a deletion journal if it omits the user's linked athlete or a surviving owned profile. Four new offline regression tests cover scope drift, foreign linkage and recovery after profile removal. This does **not** prove atomic journal uniqueness or private file purge. Production Base44 security scan remains `out_of_date`, staging scan status `none`; staging tenant isolation and all runtime deletion probes remain unverified.

> **2026-11-15 operator triage checkpoint:** Prior exact-head `5706ec3` passed CI run `43658654592`. Draft PR #195 now includes a pure privacy-minimizing recovery-journal triage helper with three offline tests; it never authorizes journal purging and cannot inspect live records. Admin runtime reconciliation, unique journal locking, private file-byte purge and staging isolation remain blocked/unverified. The production Base44 scan is stale and truncated; surfaced path names are leads only, not confirmed credential exposures. Latest CI must be checked independently.

> **2026-11-15 public-support security hardening:** Previous PR head `a65f66a` passed CI run `43658861654`. A source-confirmed abuse path in unauthenticated `logBetaFeedback` was hardened in draft PR #195 with bounded input validation, schema-safe categories, per-worker rate limiting and generic error responses, plus offline regression tests. This is not complete distributed abuse protection, and the current head requires CI verification. Existing deletion, private-file purging, staging isolation and stale-scan findings remain open P0 gates. Source-inspected coach invite handlers contain nonfunctional placeholder code; deployed usage remains unverified.

> **2026-11-15 public feedback body-limit follow-up:** Prior head `b012cbe` passed CI run `43659130876`. Draft PR #195 now enforces 16 KB streaming request limits even without trustworthy `Content-Length`, with offline regression tests. The coach roster uses direct `CoachAthleteAssignment.create` rather than references to the source placeholder invite handlers; Base44's deployed-function inventory was truncated, so deployment status is **not verified**. Distributed feedback limiting, private upload byte purging, unique deletion journals, staging isolation and current security scan findings remain blockers. Latest-head CI must pass before claiming this fix validated.

> **2026-11-15 coach privacy containment:** Draft PR #195 now disables unverified self-service roster linking in CoachWorkspace (direct assignment creation and client-side `coached_athletes` grants), with four source-level regression tests. The athlete-consent and server-authorization gate is **not implemented**: AthleteProfile and CoachAthleteAssignment RLS still require hardening and authenticated isolated-staging proof. Coach invite placeholder deployment status is unknown because Base44 function listings were truncated. Prior CI `bd11a24` failed one bounded JSON fixture, which has been corrected in source; latest exact-head CI must be verified. No merge, deploy or live data changes.

> **2026-11-15 coach RLS gate:** Earlier head `13bae2a` failed CI run `43660000731` because the coach source-audit test used a non-file URL; the fixture was corrected. Draft PR #195 now restricts `CoachAthleteAssignment.rls.create` to admins and pins that gate in an offline test. **Release still blocked:** `User.coached_athletes` may be self-editable through SDK `auth.updateMe`, so health-data RLS still needs a server-trusted grant mechanism and isolated two-account acceptance. Source-only coach invitation placeholders have no discovered frontend callers, but truncated Base44 function lists do not prove deployment state. No live changes made; latest CI pending verification.

> **2026-11-15 coach read RLS containment:** Previous head `c66b7bb` passed CI run `43660786434`. Draft PR #195 now removes all 11 source-identified `coached_athletes`-based health-data RLS read grants and adds offline regression tests. This deliberately suspends ordinary coach read access pending an athlete-consented, trusted server-side authorization design. **Release remains blocked:** Base44 User-field update restrictions are unverified, and the separate `athlete_profile_id` self-grant risk is unresolved. These draft RLS rules have not been deployed or runtime-tested. Staging isolation, private-file purging, atomic journal locking, distributed public throttling and a fresh security scan remain blocked.

> **2026-11-15 personal-link RLS containment:** Previous exact head `e8eaf898` passed CI run `43662020912`. Draft PR #195 now removes `User.athlete_profile_id`-derived read grants from 11 health-data entities and update grants from AthleteProfile, keeping creator and admin rules. Offline regression checks added. **Not deployable yet:** service-created records may become unreadable, and field-level User update controls plus synthetic two-account authorization tests are unverified. Restore access through a server-trusted ownership mapping and athlete-consented coaching design. Private file purge, deletion journal atomicity, staging isolation, rate limits, invite deployment and scan freshness remain open.

> **2026-11-15 ownership provenance checkpoint:** Prior PR head `c36de04` passed run `43683099141`. Source audit confirms `backfillOwnershipMapping` and `auditLinkageMapping` derive User link fields from `AthleteProfile.created_by_id`, not immutable proof for service-created profiles; the nominally read-only audit also writes User updates. Draft PR #195 now requires creator-scoped ownership in `fetchAthleteProfile` with three offline tests. Restoring access to non-creator service-generated data requires verified server-owned provenance, migration and synthetic staging checks. Field-level `auth.updateMe` restrictions and all existing deletion, purge, rate-limit, invite, staging and scan gates remain unverified. Latest-head CI pending.

> **2026-11-15 running calibration investigation:** User reported changes to VDOT/threshold after poor runs and cycling. Source shows threshold algorithms could accept unanchored ≥18-minute runs as threshold-intensity evidence; three calculation copies now fail closed when neither Daniels VDOT pace nor LTHR anchors intensity, with offline regression cases. VDOT uses best recent nominal run but lacks race/maximal-effort verification, and incorrect sport labels may admit cycling. Stored versus dynamically computed metrics, performance provenance and multisport acceptance remain unverified. No live athlete values accessed or changed. Check latest exact-head CI before accepting this draft change.

> **2026-11-15 return-to-running calibration UI:** Previous PR head `74a1ce4` failed CI due to TS5097: a new test imported Deno-only `base44/shared/thresholdPace.ts`, pulling its `.ts` extension import into the frontend typechecker. Test now imports the frontend science engine. Added pure running-calibration confidence classification, regression cases for 56-day running break, cycling, comeback and provisional threshold observations, and dashboard labels which no longer present a historical threshold as verified current ability. This does **not** compute detraining percentages or change stored VDOT/threshold. A model that can justify current threshold numeric adjustments and longer-window reliable activity coverage remains a release gate.

> **2026-11-15 shared calibration provenance:** Earlier PR head `783d2fd` passed CI run `43688269124`. One shared running-confidence classifier now feeds both frontend and server `physiologyCompute`; server returns confidence and source evidence (VDOT source session, threshold method, run and cross-training counts, last-logged-run age and last-200-session history scope). No numerical detraining adjustment or stored baseline mutation. CI for current head pending. Unverified running intensity, mislabeled cycling, truncated workout history and validated return-to-running thresholds remain blockers, alongside all prior privacy/staging/deletion gates.

> **2026-11-15 calibrated history completeness:** Prior exact head `279ddff` passed CI run `43690471315`. Running-gap classification now supports explicit `historyTruncated` evidence from capped frontend (`visibleRange`) and backend (last 200 workouts) query results. A truncated result returns `incomplete_history` instead of asserting a 42+ day break; backend includes `history_truncated` provenance and dashboard labels limited history. Focused tests cover truncated and complete 56-day example plus backend contract. No historic VDOT/threshold changes. **Remaining:** query pagination must be verified, true race/threshold effort provenance and mislabeled cycling excluded, incomplete history cannot establish detraining, no automatic numeric recalibration. Prior privacy/account-deletion/staging/security blockers stay open.

> **2026-11-16 VDOT provenance fail-closed:** Prior head `62a205a` passed Actions `43695181573`. Source audit found Garmin/COROS/Strava ingest stores sport and summary activity fields but no trusted race/maximal-effort attestation in WorkoutSession; some COROS/Strava paths default unknown sports to running. Draft `physiologyCompute` now uses `runningVdotProvenance.js` to exclude all unverified sessions from dynamic VDOT and retain `AthleteProfile.vdot_estimate` only as a *historical unverified* reference. Response includes verification flag and rejection reason. Six synthetic tests cover easy comeback runs, disguised cycling, Strava descriptions, absent baseline, backend wiring and schema. No stored baselines changed; verified race input and athlete consent remain prerequisites for future numeric recalibration. Prior P0 privacy, deletion, file purge, rate limit, staging, invite and scan blockers stay open.

> **2026-11-16 race evidence review contract:** Previous PR head `74a8f96` passed CI run `43835379524`. Added a **non-authorising** pure `runningPerformanceCandidate.js` gate and synthetic Garmin/COROS/Strava tests. Plausible declared races or threshold tests are review candidates only; all remain `performance_verified:false` and `may_recalibrate:false`, including source records claiming `verified` or `consent`. Unknown providers, unsupported sports, easy runs, missing provider identity, invalid metrics and ride-like speeds fail closed. No trusted athlete-consent attestation or RaceResult persistence was introduced. Historic VDOT and threshold remain unchanged; authenticated service validation, independent race evidence, immutable ownership, auditable consent and staging tests remain blockers. Maintain all P0 privacy, deletion, file purge, rate-limit, staging, invite and scan gates.

> **2026-11-15 P0 deletion checkpoint (draft PR #195):** The source-level account deletion fail-closed gate and athlete-ID-scoped service-created record cleanup have been added with offline regression tests. CI was green for earlier head `a1b76a9`; CI for the latest edits is not yet confirmed. **Checklist 1.7 remains unverified:** uploaded files are not proven purged, staging tenant isolation is not proven, and no authenticated deletion test has been run. The Base44 app inventory shows separate TrainPaceLab and TrainPaceLab-Staging app IDs only. See `docs/ACCOUNT_DELETION_ACCEPTANCE_2026-11-15.md` for precise acceptance gates. No production deletion or deployment has occurred.

---

## Route inventory (grounding)

**Public (no auth):** `/` Landing · `/login` · `/register` · `/forgot-password` · `/reset-password` · `/support` · `/terms` · `/privacy` · `/refund`
**Authenticated:** `/app` Home · `/coach` CoachChat · `/recovery` · `/predict` · `/pbs` · `/calendar` · `/kanban` · `/physiology` · `/vdot` · `/weather` · `/zones` · `/analytics` · `/plan` · `/settings` · `/import` · `/subscribe` · `/roster` CoachWorkspace · `/admin` · `/guide`

Every route is checked on **mobile (≤473px) and desktop** during its phase.

---

## Phase 0 — Account & onboarding (P0, blocks all beta)

The first thing a tester does. If this fails, nothing else gets tested.

| # | Checklist item | Expected outcome (pass) | Sev | Status | Evidence |
|---|---|---|---|---|---|
| 0.1 | `/login` renders, email+password + Google + forgot link all present | All controls visible and tappable on mobile | 🔴 | 🟡 | |
| 0.2 | Sign in with valid creds → hard redirect to `/app` | Lands on Home, not a blank or login loop | 🔴 | 🟡 | |
| 0.3 | Sign in with wrong password → inline error, no redirect | Generic error shown, submit re-enabled | 🔴 | 🟡 | |
| 0.4 | `/register` → email+pass+confirm → OTP screen → verifyOtp → redirect to `/app` | Full multi-step completes; no `loginViaEmailPassword` shortcut | 🔴 | 🟡 | |
| 0.5 | Resend OTP works from the OTP screen | New code accepted | 🟡 | 🟡 | |
| 0.6 | `/forgot-password` → generic success regardless of email exists | Always shows success, no email enumeration | 🔴 | 🟡 | |
| 0.7 | `/reset-password?token=` → new password+confirm → redirect to `/login` | Reset completes; can sign in with new password | 🔴 | 🟡 | |
| 0.8 | New account with no `AthleteProfile` lands on onboarding flow, not a crash | `OnboardingFlow` renders; profile created on submit | 🔴 | 🟡 | |
| 0.9 | Onboarding from a race result estimates VDOT/threshold and persists profile | Estimates shown; profile visible in `/settings` after | 🔴 | 🟡 | |
| 0.10 | Returning user with profile lands on Home dashboard, no duplicate profile created | Exactly one `AthleteProfile` per user | 🔴 | 🟡 | |

**Phase 0 gate:** all 🔴 items ✅ before inviting any external tester.

---

## Phase 1 — Privacy & data integrity (P0, blocks broad invite)

| # | Checklist item | Expected outcome (pass) | Sev | Status | Evidence |
|---|---|---|---|---|---|
| 1.1 | User A cannot read User B's `WorkoutSession`/`DailyMetrics`/`LabResult` via the SDK | Filter returns only A's records | 🔴 | 🟡 | |
| 1.2 | `athlete_profile_id` + `coached_athletes` on the user record gates reads (S5 RLS) | Cross-athlete reads return empty, not 403-crash | 🔴 | 🟡 | |
| 1.3 | Coach picker enumerates only the coach's roster, never the full athlete directory | Roster = `CoachAthleteAssignment` rows for this coach | 🔴 | 🟡 | |
| 1.4 | `created_by_id` is stamped on every ingest path (file, webhook, bulk) | New `WorkoutSession`/`WorkoutAsset` carry owner id | 🔴 | ✅ | Code-audited in `PRODUCTION_ROADMAP.md` B1.1: user-context SDK auto-stamps file/bulk; webhook functions stamp `created_by_id: athlete.created_by_id` explicitly. Runtime retest not required for the stamp itself. |
| 1.5 | `updateAthleteProfile` authorizes via `created_by_id` OR linked `athlete_profile_id` | Owner can save; non-owner gets 403 | 🔴 | 🟡 | |
| 1.6 | `resetAthleteData` deletes only the caller's workouts/plans/telemetry | Other users' counts unchanged after | 🔴 | 🟡 | |
| 1.7 | `deleteAccount` removes the user + their data and signs out | Cannot sign back in; data gone | 🔴 | 🟡 | |
| 1.8 | One-time ownership backfill has run before RLS publishes | No tester is locked out of their own records | 🔴 | ✅ | `backfillOwnershipMapping` ran + `auditLinkageMapping` first audit: 3 users, 0 auto-relinked, 0 flagged (`PRODUCTION_ROADMAP.md` B1.2). Re-run if new users appear before invite. |

**Phase 1 gate:** all 🔴 ✅. This is the single biggest privacy gap — do not invite a cohort with 1.1–1.4 unverified.

---

## Phase 2 — Billing & entitlement (P0, real money)

| # | Checklist item | Expected outcome (pass) | Sev | Status | Evidence |
|---|---|---|---|---|---|
| 2.1 | `/subscribe` shows Pro = A$9/mo, Coach Pro = Coming Soon; matches Stripe | Pricing copy consistent across landing + subscribe + Stripe | 🔴 | 🟡 | |
| 2.2 | Checkout opens top-level (not iframe); popup path works when framed | No "published app only" guard; tab opens on user click | 🔴 | 🟡 | |
| 2.3 | Live checkout creates `Subscription` with `base44_app_id` metadata | Record provisioned after webhook | 🔴 | 🟡 | |
| 2.4 | `stripeWebhook` registered on published domain, `STRIPE_WEBHOOK_SECRET` valid | Events reach the function and update subscription status | 🔴 | 🟡 | |
| 2.5 | `Subscription` `plan` gates premium features; free tier capped | AI coach 5 msg/wk enforced; upgrade unlocks | 🔴 | 🟡 | |
| 2.6 | `stripeBillingPortal` lets a subscriber manage/cancel | Portal loads for an active subscriber | 🟡 | 🟡 | |
| 2.7 | `redeemAccessCode` provisions plan + expiry; expired code rejected | Tester unlocks features; expired code shows error | 🟡 | ✅ | Verified live (`PRODUCTION_ROADMAP.md` B1.4): redeem → `pro/active` provisioned with correct expiry; 2nd redeem rejected (410 use-limit); expired code rejected (410). Test codes + subscription cleaned up. |
| 2.8 | Archived A$19 Pro price and deactivated Team product cleaned up in Stripe | Only the active A$9 price is live | 🟡 | ✅ | Audited via Stripe API (`PRODUCTION_ROADMAP.md` B1.3): 0 subscriptions on the archived A$19 price; price `active=false` (archived — Stripe prices aren't hard-deletable); Team product + A$49 price deleted. `PRO_PRICE_ID` = active A$9 monthly. |
| 2.9 | Test-mode checkout isolated from live (separate test price/secret) | Test flow never touches live keys | 🟡 | 🟡 | |

**Phase 2 gate:** 2.1–2.5 must be ✅. Real charges are involved — do not invite with billing unverified.

---

## Phase 3 — App-wide UX & feature journeys (P1, broaden once Phase 0–2 pass)

One pass per route on mobile and desktop. Expected outcome for every row: route renders (not the scaffold Page-Not-Found), no sideways scroll, no uncaught console errors, and the listed interaction completes.

### 3a. Dashboard & training tools

| # | Route / flow | Interaction to verify | Sev | Status | Evidence |
|---|---|---|---|---|---|
| 3.1 | `/app` Home | Loads with empty state when no workouts; widgets don't blank-screen | 🔴 | 🟡 | |
| 3.2 | `/app` Home | `LoadStatusCards` shows real numbers, not `NaN` | 🔴 | 🟡 | |
| 3.3 | `/app` Home | Log a workout via the wizard → appears in recent workouts + persists | 🔴 | 🟡 | |
| 3.4 | `/plan` TrainingPlan | Generates a plan without a 500; plan sessions persist | 🔴 | 🟡 | Code fix landed (`TrainingPlan.jsx` try/catch + null guards, `PRODUCTION_ROADMAP.md` B0.1). Live retest on published app pending. |
| 3.5 | `/coach` CoachChat | Sends a message; AI replies; no orphaned test/E2E thread surfaces | 🔴 | 🟡 | `CoachMessage` queried live: 0 records — no test thread to surface (B0.6 ✅). Send/reply runtime retest on published app still pending. |
| 3.6 | `/predict` RacePrediction | Produces a prediction for a saved profile | 🟡 | 🟡 | |
| 3.7 | `/pbs` Pbs | Shows current-year + all-time bests; empty state if none | 🟡 | 🟡 | |
| 3.8 | `/calendar` Calendar | Renders sessions; tap a day | 🟡 | 🟡 | |
| 3.9 | `/kanban` TrainingKanban | Drags a card between columns; persists on reload | 🟡 | 🟡 | |
| 3.10 | `/analytics` AdvancedAnalytics | Charts render with data; empty state if none | 🟡 | 🟡 | |

### 3b. Science & physiology tools

| # | Route / flow | Interaction to verify | Sev | Status | Evidence |
|---|---|---|---|---|---|
| 3.11 | `/physiology` | Physiology Lab opens (the Tools dropdown link works on mobile) | 🔴 | 🟡 | Code fix landed (`ToolsDropdown.jsx` renders LABS as direct links, `PRODUCTION_ROADMAP.md` B0.4). Mobile tap-test on published app pending. |
| 3.12 | `/vdot` | VDOT calculator returns a value | 🟡 | 🟡 | |
| 3.13 | `/weather` | Weather adjust returns an adjusted pace | 🟡 | 🟡 | |
| 3.14 | `/zones` | Zones render from profile thresholds | 🟡 | 🟡 | |
| 3.15 | `/recovery` | Recovery center shows latest readiness + source badge | 🟡 | 🟡 | |

### 3c. Data, settings, support

| # | Route / flow | Interaction to verify | Sev | Status | Evidence |
|---|---|---|---|---|---|
| 3.16 | `/import` | Upload a FIT/TCX/CSV → `WorkoutSession` + `WorkoutAsset` created; multi-file reconciles | 🔴 | 🟡 | |
| 3.17 | `/import` | Webhook setup guides render; secret shown | 🟡 | 🟡 | |
| 3.18 | `/settings` | Save profile changes (incl. tier) → persists + time constants update | 🔴 | 🟡 | |
| 3.19 | `/settings` | COROS connect → historical sync → recovery sync → disconnect | 🔴 | 🟡 | |
| 3.20 | `/settings` | Garmin/Strava shown as Coming Soon (not interactive sync) | 🔴 | 🟡 | |
| 3.21 | `/settings` | Wearable OAuth (Oura/Whoop/etc.) connect + recovery sync + token refresh | 🟡 | 🟡 | |
| 3.22 | `/roster` CoachWorkspace | Add athlete; comparison table renders; only roster athletes shown | 🟡 | 🟡 | |
| 3.23 | `/admin` | AccessCode create + list; admin-only for non-admins | 🟡 | 🟡 | |
| 3.24 | `/guide` | User guide sections open | 🟡 | 🟡 | |
| 3.25 | `/support` | Support route renders and is reachable from landing footer | 🟡 | 🟡 | |
| 3.26 | Beta Feedback modal | Submits a `BetaFeedback` record; route captured | 🟡 | 🟡 | |

### 3d. Public & legal

| # | Route / flow | Interaction to verify | Sev | Status | Evidence |
|---|---|---|---|---|---|
| 3.27 | `/` Landing | Hero, pricing, CTAs render; links to `/login` + `/support` work | 🔴 | 🟡 | |
| 3.28 | `/terms` `/privacy` `/refund` | Each renders readable legal copy | 🟡 | 🟡 | |
| 3.29 | Protected route when signed out | Redirects to `/login`, not blank | 🔴 | 🟡 | |
| 3.30 | Unknown route | Shows PageNotFound scaffold, not a crash | 🟡 | 🟡 | |

**Phase 3 gate:** all 🔴 (3.1–3.5, 3.11, 3.16, 3.18–3.20, 3.27, 3.29) ✅ before cohort invite.

---

## Phase 4 — Integration honesty & edge cases (P1)

| # | Checklist item | Expected outcome (pass) | Sev | Status | Evidence |
|---|---|---|---|---|---|
| 4.1 | Wearable messaging sweep: no surface implies Garmin/Strava direct sync is live today | Single source of truth = `src/lib/wearableCatalog.js` | 🔴 | 🟡 | |
| 4.2 | COROS full path on published domain: connect → history → recovery → webhook ingest | End-to-end on `trainpacelab.base44.app`, not preview | 🔴 | 🟡 | |
| 4.3 | Duplicate webhook event (same `event_id`) is skipped, not re-ingested | `WebhookEvent` dedup holds | 🔴 | 🟡 | |
| 4.4 | Large workout history load on Home does not blank the dashboard | Loads with skeletons; no NaN | 🟡 | 🟡 | |
| 4.5 | Offline / flaky network: forms show inline error, no silent failure | Errors bubble to UI | 🟡 | 🟡 | |
| 4.6 | iOS: no rubber-banding / long-press callout on interactive surfaces | `overscroll-behavior-y:none` holds | 🟡 | 🟡 | |

**Phase 4 gate:** 4.1–4.3 ✅.

---

## Phase 5 — Beta go/no-go gates & staged rollout (P1)

Before inviting anyone, **all** of these must be ✅:

- [ ] Phase 0 gate (0.1–0.10 🔴) ✅
- [ ] Phase 1 gate (1.1–1.8 🔴) ✅
- [ ] Phase 2 gate (2.1–2.5 🔴) ✅
- [ ] Phase 3 gate (all 🔴) ✅
- [ ] Phase 4 gate (4.1–4.3 🔴) ✅
- [ ] Support path reachable (`/support` + beta feedback modal)
- [ ] Error monitoring wired (`logErrorToAirtable`) so failures are visible to the team

### Rollout cohorts

| Cohort | Size | Who | Exit criteria to advance |
|---|---|---|---|
| C0 | 1–2 | Builder + 1 trusted tester | All 🔴 items still ✅ after 48h; no new ❌ |
| C1 | 5–10 | Invite-only, mixed devices | Zero 🔴 ❌; <3 🟡 open; billing path exercised by ≥1 real or test-mode purchase |
| C2 | 20–50 | Wider opt-in | Zero 🔴 ❌; <5 🟡 open; support requests answered <48h |
| C3 | public | Anyone | All gates green; monitoring + analytics live |

A cohort advances only when its exit criteria are met. Any 🔴 ❌ blocks the next cohort until the root cause is fixed and the item retests ✅.

---

## Retest rules

- A fix is not a pass: retest the same checklist item end-to-end after the edit, then record fresh evidence.
- When a shared component or service changes (e.g. `workoutIngest`, RLS, service adapter), retest every phase row that depends on it, not just the one that failed.
- Preview/browser limitations are 🟡 unverified until confirmed on the published app; never mark them ✅.
- Triage every ❌ by severity (🔴 blocks, 🟡 degrades) and user impact before fixing.