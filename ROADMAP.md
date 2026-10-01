# TrainPaceLab: Unified Roadmap + Atomic Job Checklist

_Goal: move from the current published-but-beta state to a confident public launch._
_Status legend: ✅ done · 🟡 in progress · 🔴 open · ⛔ blocked._

The app is already live at `trainpacelab.base44.app` and accepting real Stripe payments, so "production" here means **launch-ready**: stable, secure, honest, observable, and free of the known crashes.

---

## Overview

This roadmap is split into **three execution phases**:
1. **BETA Phase 0–3**: Stabilize core, add privacy gates, validate integrations, add observability
2. **PRODUCTION Phase 1–2**: Harden IP, CI/CD, dashboards, launch assets
3. **PRODUCTION Phase 3**: Soft launch, monitoring, iteration, public launch

Each phase contains roadmap themes (P0–P5) cross-linked to **atomic jobs** (numbered 1–209). Jobs within a phase have no inter-phase dependencies; work them top-to-bottom within each phase, then gate-check before advancing.

---

# BETA — Phase 0: Stabilize the Core (Launch Blockers)

**Gate:** 7 crash-free days, error rate < 2%, smoke-test complete.
**Roadmap link:** P0 (Launch blockers)

### B0.1 — Fix TrainingPlan 500 ← **P0.1**

- [ ] **Job 1** Open `/plan` on the published app while logged in as an athlete with a plan; capture the exact error from the browser network tab.
- [ ] **Job 2** Open `/plan` for an athlete with no plan; capture that error too.
- [ ] **Job 3** Read `src/pages/TrainingPlan.jsx` and trace the data-fetch call that 500s.
- [ ] **Job 4** Read the backend function / service call it hits; identify the bad request shape or missing field.
- [ ] **Job 5** Fix the request shape / null guard in the frontend or the backend response.
- [ ] **Job 6** Reload `/plan` (with-plan and without-plan); confirm both render without a 500.
- [ ] **Job 7** Reload `/plan` after a hard refresh (clear cache); confirm still clean.

**PRD:** TrainingPlan.jsx must not 500-error when loading a plan or on fresh-athlete no-plan view. Ensure request shape matches backend contract and all required fields have null guards.

---

### B0.2 — Per-Widget Error Boundaries ← **P0.2**

- [ ] **Job 8** Read `src/components/common/WidgetBoundary.jsx` and `src/pages/Home.jsx`; confirm all 12 widgets are wrapped.
- [ ] **Job 9** List any dashboard widget not yet wrapped in `WidgetBoundary`; wrap each.
- [ ] **Job 10** Force-throw inside one wrapped widget (temporary `throw new Error("test")`); confirm the fallback card renders, not a blank screen.
- [ ] **Job 11** Confirm the throw is logged to Airtable via `logErrorToAirtable`.
- [ ] **Job 12** Revert the forced throw.

**PRD:** Every dashboard widget must be wrapped in PageErrorBoundary or WipWrapper. A crashed widget shows a graceful fallback card, not a blank screen or app crash.

---

### B0.3 — LoadStatusCards NaN (Confirm, Already Guarded) ← **P0.3**

- [ ] **Job 13** Read `src/components/dashboard/LoadStatusCards.jsx`; confirm the `null`-on-NaN guards are present.
- [ ] **Job 14** Load Home for a fresh athlete (zero workouts); confirm no `NaN` in console.
- [ ] **Job 15** Load Home for an athlete with partial data (duration but no HR); confirm no `NaN`.

**PRD:** LoadStatusCards must handle divide-by-zero and missing-field cases, rendering "—" or 0 instead of NaN.

---

### B0.4 — Mobile Physiology Lab Nav ← **P0.4**

- [ ] **Job 16** Read `src/components/layout/ToolsDropdown.jsx`; find the nested trigger for Physiology Lab.
- [ ] **Job 17** Read `src/components/layout/MobileNav.jsx` and `navItems.js`.
- [ ] **Job 18** Reproduce on a 390px viewport: tap Tools → Physiology Lab; confirm it doesn't fire.
- [ ] **Job 19** Fix the nested-trigger tap target / event handling so it opens on mobile.
- [ ] **Job 20** Verify on 390px, 768px, and desktop that the link still works.

**PRD:** Physiology Lab link in Tools dropdown must fire on mobile (390px) and desktop. Fix nested-nav tap-target interaction so touch events propagate to the link.

---

### B0.5 — Service-Layer Adapter Audit ← **P0.5**

- [ ] **Job 21** Read `src/services/adapters/base44/index.ts`; confirm the four SDK-mapping fixes are present.
- [ ] **Job 22** Load Home, Imports, Settings; confirm no adapter runtime errors in console.
- [ ] **Job 23** Audit every frontend call to `base44ConnectorGateway`; list each caller.
- [ ] **Job 24** Move each `base44ConnectorGateway` caller behind a backend-function proxy (connectors are server-side).
- [ ] **Job 25** Re-test Home, Imports, Settings after the proxy move.

**PRD:** Service adapters must match live Base44 SDK shape. `base44ConnectorGateway` must not be called client-side; move all calls behind backend-function proxies.

---

### B0.6 — Remove Orphaned E2E Test Conversation

- [ ] **Job 26** Read the AI Coach dashboard data source (CoachMessage entity / CoachChat page).
- [ ] **Job 27** Identify the orphaned test conversation record by its content/created_date.
- [ ] **Job 28** Delete that single record (admin).
- [ ] **Job 29** Reload the AI Coach dashboard; confirm it's gone.

**PRD:** Remove the leftover test thread from the coach chat data before any public push.

---

### B0.7 — Builder-Plan Function-Limit Decision ← **P0** (blocked)

- [ ] **Job 30** Count deployed backend functions; compare to the Builder-plan limit.
- [ ] **Job 31** Decide: upgrade workspace plan OR consolidate functions under the limit.
- [ ] **Job 32** If consolidating: identify 2+ functions that can merge; merge them.
- [ ] **Job 33** If upgrading: note it as a workspace action for the owner.

**PRD:** Resolve HTTP 403 on the 5th deployed function. Either upgrade the workspace plan or consolidate functions to stay within the Builder-plan limit.

**Status:** ⛔ Blocked — awaiting workspace plan decision.

---

### Phase 0 Smoke Pass

- [ ] **Job 34** Onboard a fresh athlete end-to-end.
- [ ] **Job 35** Log one workout manually.
- [ ] **Job 36** Confirm CTL recalculates.
- [ ] **Job 37** Generate a training plan.
- [ ] **Job 38** Send one AI coach message; confirm a reply.
- [ ] **Job 39** Run Stripe checkout (test card); confirm redirect.
- [ ] **Job 40** Confirm the `Subscription` row is provisioned.

**Gate clearance:** All Phase 0 jobs complete + smoke pass successful = **Beta Phase 0 complete**.

---

# BETA — Phase 1: Data Privacy & Billing Integrity

**Gate:** Privacy isolation verified on two accounts, RLS audits pass, Stripe round-trips verified.
**Roadmap link:** P1 (Security & data integrity)

### B1.1 — Ownership Authorization Gate ← **P1** (S4 + S5 combined)

- [ ] **Job 41** Create / use a second non-admin test account.
- [ ] **Job 42** Have it attempt to ingest against another athlete's `athlete_id`; confirm 403.
- [ ] **Job 43** Have it ingest against its own `athlete_id`; confirm success.
- [ ] **Job 44** Confirm admin bypass still ingests any profile.

**PRD:** Stamp `created_by_id` on WorkoutSession/WorkoutAsset in `ingestWorkoutFile`, `webhookWearableSync`, `workoutWebhook`, `garminWebhook`. Non-admins must not ingest against another athlete's profile.

**Scope:** ingestWorkoutFile, webhookWearableSync, workoutWebhook, garminWebhook

---

### B1.2 — Health-Data RLS + Linkage ← **P1 (S5)**

- [ ] **Job 45** With two linked accounts, confirm Account A cannot read Account B's `WorkoutSession`/`DailyMetrics`/`LabResult` via the UI.
- [ ] **Job 46** Run `auditLinkageMapping`; confirm 0 flagged.
- [ ] **Job 47** Create a deliberately unlinked user; run `auditLinkageMapping`; confirm it auto-relinks or flags correctly.
- [ ] **Job 48** Confirm every user in the DB has `athlete_profile_id` set.

**PRD:** Health data must be scoped by athlete roster linkage. Any authenticated user can no longer read any athlete's data. Implement row-level security (RLS) or ownership checks on WorkoutSession, DailyMetrics, LabResult queries. Coach picker must not enumerate the whole athlete directory.

---

### B1.3 — Stripe Provisioning (End-to-End) ← **P1** (Stripe cleanup)

- [ ] **Job 49** Run a live test checkout (test card) on the published app.
- [ ] **Job 50** Confirm the `checkout.session.completed` event hits `stripeWebhook`.
- [ ] **Job 51** Confirm a `Subscription` row is created with `plan: pro`, `status: active`.
- [ ] **Job 52** Confirm `useSubscription` unlocks Pro features in the UI.
- [ ] **Job 53** Simulate a cancellation event; confirm the `Subscription` flips to `canceled`.
- [ ] **Job 54** Confirm the archived A$19 price has zero active subscriptions.
- [ ] **Job 55** Audit all webhook secrets: confirm `STRIPE_WEBHOOK_SECRET` is set and valid for `https://trainpacelab.base44.app/functions/stripeWebhook`.
- [ ] **Job 56** Rotate any secrets reused across test/live environments.

**PRD:** Confirm no subscriptions are grandfathered on the archived A$19 Pro price; if none, delete it. Delete the deactivated Team product. Ensure `stripeWebhook` endpoint is registered to the published domain with a valid secret. Rotate all live secrets; confirm no test/live cross-contamination.

---

### B1.4 — Access-Code Flow ← **P4** (Beta access-code flow)

- [ ] **Job 57** Generate a `max_uses=2` code in Admin → AccessCodeManager.
- [ ] **Job 58** Redeem once; confirm `Subscription` provisioned with correct expiry.
- [ ] **Job 59** Redeem twice (different account); confirm second redeem succeeds, third is rejected (410).
- [ ] **Job 60** Generate an already-expired code; confirm redeem is rejected (410 expired).
- [ ] **Job 61** Clean up all test codes and provisioned test subscriptions.

**PRD:** Access-code redemption must work end-to-end: admin creates code → tester redeems → Subscription provisioned → features unlock → expiry enforced.

---

### Phase 1 Gate Check

- [ ] **Job 62** Two-account isolation verified (no cross-read of health data).
- [ ] **Job 63** `auditLinkageMapping` passes (0 flagged).
- [ ] **Job 64** Stripe checkout → Subscription provisioning verified.
- [ ] **Job 65** Secrets audit complete (STRIPE_*, COROS_*, WEBHOOK_SYNC_SECRET all set and rotated).

**Gate clearance:** Phase 1 jobs complete + gate check passed = **Beta Phase 1 complete**.

---

# BETA — Phase 2: Integration Honesty & COROS Validation

**Gate:** COROS validated on prod domain, wearable-honesty sweep complete, Garmin/Strava stay Coming Soon.
**Roadmap link:** P2 (Integration honesty & completion)

### B2.1 — COROS Live-Domain Validation ← **P2** (COROS OAuth)

- [ ] **Job 66** On `trainpacelab.base44.app` (not preview), run COROS connect.
- [ ] **Job 67** Confirm a token is stored in `CorosConnection`.
- [ ] **Job 68** Trigger historical sync; confirm a real workout appears in `WorkoutSession`.
- [ ] **Job 69** Trigger recovery sync; confirm `DailyMetrics` populates (HRV/sleep/resting HR).
- [ ] **Job 70** Push a COROS webhook; confirm it dedups via `WebhookEvent`.

**PRD:** Run the full connect → historical sync → recovery sync → webhook ingest path on `trainpacelab.base44.app` (prod domain, not preview). All four steps must complete without error.

---

### B2.2 — Wearable-Honesty Sweep ← **P2** (Wearable messaging honesty sweep)

- [ ] **Job 71** Read `src/lib/wearableCatalog.js`; list every provider's current status.
- [ ] **Job 72** Audit `src/components/onboarding/WearableStep.jsx` for sync claims.
- [ ] **Job 73** Audit `src/components/settings/WearableIntegrations.jsx`.
- [ ] **Job 74** Audit `src/components/imports/WebhookSetupGuides.jsx`.
- [ ] **Job 75** Audit the Landing page wearable copy.
- [ ] **Job 76** Audit email / share copy templates.
- [ ] **Job 77** Fix any surface that claims Garmin/Strava direct sync is available today.

**PRD:** Ensure no remaining surface (onboarding, settings, emails, share copy) implies Garmin/Strava direct sync is available today. Single source of truth = `wearableCatalog.js`. Mark Garmin/Strava as **Coming Soon**; mark COROS/Oura/WHOOP/Polar as **Live**.

---

### B2.3 — Oura/WHOOP/Polar Recovery Sync ← **P2** (Generic wearable OAuth)

- [ ] **Job 78** Connect Oura on the published app; confirm recovery syncs.
- [ ] **Job 79** Connect WHOOP; confirm recovery syncs.
- [ ] **Job 80** Connect Polar; confirm recovery syncs.
- [ ] **Job 81** For each: let the token expire; confirm refresh works and `last_sync_at` updates.
- [ ] **Job 82** Force a sync error; confirm `last_error` and `status: error` populate.

**PRD:** Confirm `wearableOAuthSync` recovery sync is live and tested for each provider (Oura, WHOOP, Polar). Verify token refresh + `last_sync_at`/`last_error` reporting.

---

### B2.4 — Garmin/Strava Stay Coming Soon ← **P2** (Garmin & Strava)

- [ ] **Job 83** Confirm `wearableCatalog.js` keeps Garmin/Strava as `coming_soon`.
- [ ] **Job 84** Confirm no live "Connect Garmin/Strava" button renders that would fail.
- [ ] **Job 85** Confirm the webhook sync endpoint returns 503 when secrets are absent.

**PRD:** Keep Garmin & Strava gated as **Coming Soon** in catalog and UI (landing + home). Do not re-enable until credentials are configured and the sync path is QA'd end-to-end.

---

### Phase 2 Gate Check

- [ ] **Job 86** COROS round-trip complete on prod domain (connect → historical → recovery → webhook).
- [ ] **Job 87** Wearable-honesty audit complete; no false sync claims remaining.
- [ ] **Job 88** Oura/WHOOP/Polar recovery syncs verified; token refresh tested.
- [ ] **Job 89** Garmin/Strava confirmed Coming Soon; no live buttons fail.

**Gate clearance:** Phase 2 jobs complete + gate check passed = **Beta Phase 2 complete**.

---

# BETA — Phase 3: Observability & Feedback Loop

**Gate:** Error monitoring active, analytics funnels tracked, beta feedback channel live.
**Roadmap link:** P3 (Reliability & QA), P5 (Post-launch observability)

### B3.1 — Error Logging ← **P3** (Error monitoring) + **P5** (Post-launch observability)

- [ ] **Job 90** Wire the global frontend error handler to `logErrorToAirtable`.
- [ ] **Job 91** Confirm `WidgetBoundary` already logs (from B0.2).
- [ ] **Job 92** Add `logErrorToAirtable` calls to backend function catch blocks:
  - [ ] `generateTrainingPlan`
  - [ ] `coachBriefing`
  - [ ] `aiDeepDive`
  - [ ] `ingestWorkoutFile`
  - [ ] `bulkIngestWorkouts`
  - [ ] `workoutWebhook`
  - [ ] `corosSync`
  - [ ] `wearableOAuthSync`
  - [ ] `stripeWebhook`
  - [ ] `stripeCheckout`
- [ ] **Job 93** Force a frontend error; confirm it's logged with stack + route + severity.
- [ ] **Job 94** Force a backend error; confirm it's logged.

**PRD:** All runtime errors (frontend and backend) must log to Airtable with severity, stack trace, route, and timestamp. Error dashboard must surface spikes and top errors.

---

### B3.2 — Analytics Funnels ← **P5** (Analytics)

- [ ] **Job 95** Add `base44.analytics.track("onboarding_complete")` at onboarding submit.
- [ ] **Job 96** Add `workout_ingested` after successful ingest (frontend + webhook).
- [ ] **Job 97** Add `plan_generated` after `generateTrainingPlan` success.
- [ ] **Job 98** Add `checkout_started` when the Stripe tab opens.
- [ ] **Job 99** Add `subscription_active` when `useSubscription` first sees an active plan.
- [ ] **Job 100** Confirm each event appears for a real flow.

**PRD:** Instrument key funnels via `base44.analytics.track`:
- `onboarding_complete`
- `workout_ingested`
- `plan_generated`
- `checkout_started`
- `subscription_active`

---

### B3.3 — Beta Feedback Channel ← **P3** (Reliability & QA)

- [ ] **Job 101** Read `src/components/feedback/BetaFeedbackModal.jsx`.
- [ ] **Job 102** Surface the modal prominently on Home during beta (banner or floating button).
- [ ] **Job 103** Confirm submissions land in a triage list (Airtable or entity).

**PRD:** Beta testers must have a one-tap feedback channel. Modal auto-surfaces on Home; submissions auto-triage into Airtable.

---

### B3.4 — Wearable Sync Health View ← **P5** (Wearable sync health)

- [ ] **Job 104** Add an Admin view listing `*Connection` records: `last_sync_at`, `last_error`, `status`.
- [ ] **Job 105** Confirm an admin can see which athletes' syncs are failing.

**PRD:** Surface `last_sync_at` / `last_error` / `status` per `*Connection` in an admin view. Alert on sustained `error`/`expired` status.

---

### Phase 3 Gate Check

- [ ] **Job 106** Error logging active; Airtable receiving frontend + backend errors.
- [ ] **Job 107** Analytics funnels verified (all 5 events tracked for a real user).
- [ ] **Job 108** Beta feedback modal surfaced and auto-triaging.
- [ ] **Job 109** Admin sync health view live and functional.

---

### Beta Exit Checklist

- [ ] **Job 110** Invite 10 testers.
- [ ] **Job 111** Monitor 7 consecutive crash-free days.
- [ ] **Job 112** Confirm error rate < 2% of sessions.
- [ ] **Job 113** Confirm privacy isolation holds across two accounts.
- [ ] **Job 114** Confirm COROS round-trips on the prod domain.

**Gate clearance:** All checks passed = **Ready for Production Phase 1**.

---

# PRODUCTION — Phase 1: Hardening

**Gate:** Science IP moved to backend, CI gated on tests, dashboards load < 2s, full E2E QA suite live.
**Roadmap link:** P1 (Security & data integrity — S6), P3 (Reliability & QA), P5 (Post-launch observability)

### P1.1 — Crown-Jewel IP to Backend ← **P1 (S6)**

- [ ] **Job 115** List client-bundled science files: `src/science/thresholdPace.ts`, `vdot.ts`, `racePacing.ts`, `daniels.ts`, `zones.ts`, `load.ts`.
- [ ] **Job 116** Move threshold-pace derivation behind a backend function; keep only a thin UI caller.
- [ ] **Job 117** Move VDOT auto-derivation behind a backend function.
- [ ] **Job 118** Move race-pacing derivation behind a backend function.
- [ ] **Job 119** Confirm the client bundle no longer contains the proprietary formulas (grep the built JS).
- [ ] **Job 120** Confirm UI latency stays acceptable (< 500ms per call).

**PRD:** The proprietary physiology engines must not ship to the browser as client JS. Move threshold-pace, VDOT auto-derivation, and race-pacing derivations behind backend functions. Client keeps only thin UI callers.

---

### P1.2 — CI Gate on Science Tests ← **P3** (CI gate on the science test suite)

- [ ] **Job 121** Read `.github/workflows/ci.yml` and `vitest.config.ts`.
- [ ] **Job 122** Add a vitest run step to CI that fails the build on a broken test.
- [ ] **Job 123** Break one golden-case test intentionally; confirm CI goes red.
- [ ] **Job 124** Revert; confirm CI goes green.

**PRD:** Move the existing vitest suite (`src/science/__tests__`, `src/math/*.test.ts`, `src/services/*.test.ts`) into `.github/workflows/ci.yml` as a required gate. Build fails if any test fails.

---

### P1.3 — Rate-Limit & Credit Budget ← **P5** (Credit & rate-limit budget)

- [ ] **Job 125** Read `base44/shared/rateLimit.ts`; tune the sliding window for `aiDeepDive`.
- [ ] **Job 126** Tune limits for `coachBriefing`.
- [ ] **Job 127** Tune limits for `generateTrainingPlan`.
- [ ] **Job 128** Confirm the free-tier 5-msg/week cap enforces.
- [ ] **Job 129** Add `Retry-After` header to rate-limited responses.
- [ ] **Job 130** Monitor `InvokeLLM` / `GenerateImage` credit burn for a week; adjust budgets.

**PRD:** Implement sliding-window rate limits on `aiDeepDive`, `coachBriefing`, `generateTrainingPlan`. Free tier: 5 msg/week max. Rate-limited responses include `Retry-After` header. Monitor credit burn daily and tune budgets to stay solvent.

---

### P1.4 — Dashboard Load Profile ← **P3** (Dashboard load profile)

- [ ] **Job 131** Seed 500 `WorkoutSession` records for a test athlete.
- [ ] **Job 132** Load Home; measure p95 load time.
- [ ] **Job 133** If > 2s, add pagination / suspense to the 4 parallel entity filters.
- [ ] **Job 134** Re-measure; confirm < 2s at p95.

**PRD:** Home fires 4 parallel entity filters on mount. Load-test with large history. If p95 > 2s, add pagination and suspense skeletons to bring it under 2s.

---

### P1.5 — Full E2E QA ← **P3** (End-to-end QA)

- [ ] **Job 135** Automate onboarding E2E.
- [ ] **Job 136** Automate ingestion E2E.
- [ ] **Job 137** Automate CTL recalc E2E.
- [ ] **Job 138** Automate plan-gen E2E.
- [ ] **Job 139** Automate checkout E2E.
- [ ] **Job 140** Automate webhook→subscription E2E.
- [ ] **Job 141** Automate RLS isolation E2E.
- [ ] **Job 142** Automate access-code redeem E2E.
- [ ] **Job 143** Automate COROS round-trip E2E.

**PRD:** Establish a full E2E test suite covering onboarding, ingestion, CTL recalc, plan generation, checkout, webhook→subscription, RLS isolation, access-code redemption, and COROS round-trip. Suite must pass before each deploy.

**Prerequisite:** Preview-sandbox 403 must be resolved.

---

### P1.6 — Stripe Webhook Idempotency ← **P1** (Stripe cleanup)

- [ ] **Job 144** Add an `event.id` dedup check to `stripeWebhook` (store seen event ids; skip repeats).
- [ ] **Job 145** Confirm a replayed webhook event is ignored.

**PRD:** Stripe webhook handler must be idempotent. Store seen `event.id`s and skip replayed events. Prevents double-counting and re-provisioning.

---

### P1.7 — Rate-Limit Distributed State ← **P3** (Reliability & QA)

- [ ] **Job 146** Move `rateLimit.ts` from per-worker memory to shared state (or document the per-worker tradeoff).
- [ ] **Job 147** Re-test rate limiting under concurrent requests.

**PRD:** Rate-limit state must be shared across all workers, not isolated per-worker memory. Otherwise, concurrent requests can exceed the rate limit. Test under concurrent load.

---

### P1 Gate Check

- [ ] **Job 148** Science IP confirmed off the client bundle (grep built JS).
- [ ] **Job 149** CI gates on vitest; build fails if test suite breaks.
- [ ] **Job 150** Rate limits enforced; free tier capped at 5 msg/week.
- [ ] **Job 151** Dashboard load time measured at < 2s p95 (or pagination/suspense added).
- [ ] **Job 152** Full E2E suite live and passing.
- [ ] **Job 153** Stripe webhook idempotency confirmed (replay test passed).
- [ ] **Job 154** Rate-limit state shared across workers (stress-tested).

**Gate clearance:** Phase 1 jobs complete + gate check passed = **Ready for Production Phase 2**.

---

# PRODUCTION — Phase 2: Launch Assets

**Gate:** Custom domain live, SEO complete, legal review signed, pricing consistent, support route defined.
**Roadmap link:** P4 (Launch / go-to-market readiness)

### P2.1 — Custom Domain ← **P4** (Custom domain)

- [ ] **Job 155** Ask the owner for the connected custom domain.
- [ ] **Job 156** Point user-facing links at the custom domain.
- [ ] **Job 157** Confirm the custom domain serves the app.
- [ ] **Job 158** Confirm redirects (old → new) work.

**PRD:** Update all user-facing links and SEO (canonical, OG tags) to use the custom domain. Old domain must redirect to new.

---

### P2.2 — SEO ← **P4** (SEO & marketing)

- [ ] **Job 159** Finalize `index.html` title.
- [ ] **Job 160** Finalize meta description.
- [ ] **Job 161** Add Open Graph image.
- [ ] **Job 162** Add canonical URL.
- [ ] **Job 163** Add a sitemap.
- [ ] **Job 164** Run the in-platform SEO checklist.
- [ ] **Job 165** Run the AI-search score; fix low items.

**PRD:** Finalize index.html meta (title, description, OG image, sitemap, canonical). Pass in-platform SEO checklist and AI-search score audit.

---

### P2.3 — Legal Review ← **P4** (Legal pages)

- [ ] **Job 166** Final review of `Terms.jsx` for a paid health-data product.
- [ ] **Job 167** Final review of `Privacy.jsx` (wearable data, athlete health info).
- [ ] **Job 168** Final review of `Refund.jsx` (payments, refunds).
- [ ] **Job 169** Get legal sign-off (owner action).

**PRD:** Legal pages exist (Terms, Privacy, Refund). Final legal review for a paid health-data product, especially around wearable data ingestion and athlete health info. Get formal sign-off before public push.

---

### P2.4 — Pricing Copy Consistency ← **P4** (Pricing copy consistency)

- [ ] **Job 170** Confirm Pro = A$9/mo on the Landing page.
- [ ] **Job 171** Confirm Pro = A$9/mo on Subscribe.
- [ ] **Job 172** Confirm Pro = A$9/mo in Stripe.
- [ ] **Job 173** Confirm Pro = A$9/mo in access-code grants.
- [ ] **Job 174** Confirm Coach Pro = A$29 "Coming Soon" everywhere.

**PRD:** Pro = A$9/mo everywhere. Coach Pro = A$29 "Coming Soon" everywhere.

---

### P2.5 — Support / Contact Route ← **P4** (Support / contact path)

- [ ] **Job 175** Define the support path (email / form / help desk).
- [ ] **Job 176** Add a reachable contact link in the Landing footer.
- [ ] **Job 177** Confirm a user can reach support in ≤ 2 taps.

**PRD:** Define how users reach support. Add a reachable contact route on the landing footer. Users must reach support in ≤ 2 taps.

---

### P2.6 — Onboarding & Empty-State Polish ← **P4** (Launch readiness)

- [ ] **Job 178** Walk a brand-new user from landing → dashboard.
- [ ] **Job 179** Fix any dead end in onboarding.
- [ ] **Job 180** Add/verify an empty state for every dashboard section with no data.
- [ ] **Job 181** Add/verify error states for every failed fetch.
- [ ] **Job 182** Confirm a new user reaches the dashboard with no dead end.

**PRD:** New user must smoothly onboard from landing → dashboard → first action. No dead ends. Every empty section and error state must be clear and actionable.

---

### P2 Gate Check

- [ ] **Job 183** Custom domain live and all user-facing links updated.
- [ ] **Job 184** SEO audit complete (title, description, OG image, sitemap, canonical).
- [ ] **Job 185** Legal review signed off.
- [ ] **Job 186** Pricing consistent across all surfaces (Pro A$9/mo, Coach Pro A$29 Coming Soon).
- [ ] **Job 187** Support contact route live and reachable.
- [ ] **Job 188** New user onboarding tested end-to-end; no dead ends.

**Gate clearance:** Phase 2 jobs complete + gate check passed = **Ready for Production Phase 3 (Public Launch)**.

---

# PRODUCTION — Phase 3: Soft Launch & Public Launch

**Gate:** Soft-launch batch stable for 2 weeks, error rate < 1%, no billing issues, top feedback fixes shipped.
**Roadmap link:** P5 (Post-launch observability)

### P3.1 — Soft Launch to Waitlist ← **P5** (Post-launch observability)

- [ ] **Job 189** Invite the waitlist in batches (e.g., 50 → 100 → 200).
- [ ] **Job 190** Watch error dashboard for 2 weeks at batch volume.
- [ ] **Job 191** Watch billing dashboard for `past_due`/churn.
- [ ] **Job 192** Watch wearable sync `error`/`expired` rates.
- [ ] **Job 193** Confirm stable for 2 weeks at batch volume (error rate < 1%, no outages).

**PRD:** Invite waitlist in batches, monitoring error rate, billing health, and wearable sync health at each batch. Hold each batch at steady state for 2 weeks before ramping up. Target: < 1% error rate, 0 past-due subscriptions, 0 sustained sync errors.

---

### P3.2 — Monitor Health (Daily) ← **P5** (Post-launch observability)

- [ ] **Job 194** Track error rate daily; alert on spikes (threshold: > 2x baseline).
- [ ] **Job 195** Track billing transitions daily (active/canceled/past_due).
- [ ] **Job 196** Track wearable sync health daily (error % by provider).
- [ ] **Job 197** Track credit burn daily (`InvokeLLM`, `GenerateImage`).

**PRD:** Daily dashboards for error rate, billing health, wearable sync health, and credit burn. Alerting on spikes.

---

### P3.3 — Iterate on Top Feedback ← **P5** (Post-launch observability)

- [ ] **Job 198** Triage beta/soft-launch feedback from Airtable + feedback modal.
- [ ] **Job 199** Ship the top fix #1 (highest impact, lowest risk).
- [ ] **Job 200** Ship the top fix #2.
- [ ] **Job 201** Ship the top fix #3.

**PRD:** Use beta feedback + analytics to prioritize the top 3 user-facing fixes. Ship them within 1 week each.

---

### P3.4 — Public Launch & Marketing Push ← **P4 / P5** (Launch / go-to-market readiness)

- [ ] **Job 202** Enable Google Ads via the in-platform Marketing flow.
- [ ] **Job 203** Publish social posts via the in-platform flow.
- [ ] **Job 204** Remove any remaining "beta" framing from the UI.
- [ ] **Job 205** Confirm public launch is live and metrics stable (error rate < 1%, error rate stable ±10%).

**PRD:** Move from private soft-launch to public launch. Remove beta warnings. Push marketing. Confirm stability metrics hold.

---

### Phase 3 Gate Check

- [ ] **Job 206** Soft-launch batch stable for 2 weeks (error rate < 1%).
- [ ] **Job 207** Billing health verified (0 past-due, churn rate acceptable).
- [ ] **Job 208** Top 3 feedback fixes shipped and stable.
- [ ] **Job 209** Public launch live; marketing active; beta framing removed.

---

## Critical Path Summary

The fastest route to public launch:

1. **Beta Phase 0** (Jobs 1–40): Stabilize core, smoke test.
2. **Beta Phase 1** (Jobs 41–65): Lock privacy, RLS, Stripe round-trip.
3. **Beta Phase 2** (Jobs 66–89): Validate COROS, wearable honesty.
4. **Beta Phase 3** (Jobs 90–114): Observability, feedback loops, beta exit gate.
5. **Production Phase 1** (Jobs 115–154): IP to backend, CI/CD, E2E, dashboards.
6. **Production Phase 2** (Jobs 155–188): Launch assets (domain, SEO, legal, pricing).
7. **Production Phase 3** (Jobs 189–209): Soft launch (2 weeks stable) → public launch.

**No cross-phase dependencies.** Work phases top-to-bottom; use gates to confirm readiness before advancing.

---

## Next Steps

**For the agent:**
- Pick **one job** from Phase 0 and open a PRD.
- Execute the job end-to-end.
- Confirm and move to the next job.

**For the team:**
- Review the gate criteria for each phase.
- Estimate capacity and set milestone dates.
- Assign phase ownership (e.g., stability owner, security owner, launch owner).

Ready to start with **Job 1** (Fix TrainingPlan 500)?
