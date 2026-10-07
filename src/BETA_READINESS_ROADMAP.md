# TrainPaceLab — Beta Readiness Roadmap

_A risk-first, pass/fail verification plan for the staged external beta._
_Status legend: ✅ pass · ❌ fail · 🟡 unverified · ⛔ blocked. An item stays 🟡 until fresh runtime evidence is recorded._

The app is published at `https://trainpacelab.base44.app` and accepts real Stripe payments. This roadmap is the **verification** layer that sits on top of `PRODUCTION_ROADMAP.md`: it does not re-implement anything — it proves each area works for an external tester, or marks it unverified. Phases are ordered by launch risk; no phase may be marked done while a 🔴 item inside it is ❌ or 🟡.

Evidence goes in the **Evidence** column of each checklist (route, date, tester, device, and a one-line observed outcome). Source inspection alone is never a pass. Preview/browser limitations are recorded as 🟡 unverified, not as ✅.

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
| 1.4 | `created_by_id` is stamped on every ingest path (file, webhook, bulk) | New `WorkoutSession`/`WorkoutAsset` carry owner id | 🔴 | 🟡 | |
| 1.5 | `updateAthleteProfile` authorizes via `created_by_id` OR linked `athlete_profile_id` | Owner can save; non-owner gets 403 | 🔴 | 🟡 | |
| 1.6 | `resetAthleteData` deletes only the caller's workouts/plans/telemetry | Other users' counts unchanged after | 🔴 | 🟡 | |
| 1.7 | `deleteAccount` removes the user + their data and signs out | Cannot sign back in; data gone | 🔴 | 🟡 | |
| 1.8 | One-time ownership backfill has run before RLS publishes | No tester is locked out of their own records | 🔴 | 🟡 | |

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
| 2.7 | `redeemAccessCode` provisions plan + expiry; expired code rejected | Tester unlocks features; expired code shows error | 🟡 | 🟡 | |
| 2.8 | Archived A$19 Pro price and deactivated Team product cleaned up in Stripe | Only the active A$9 price is live | 🟡 | 🟡 | |
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
| 3.4 | `/plan` TrainingPlan | Generates a plan without a 500; plan sessions persist | 🔴 | 🟡 | |
| 3.5 | `/coach` CoachChat | Sends a message; AI replies; no orphaned test/E2E thread surfaces | 🔴 | 🟡 | |
| 3.6 | `/predict` RacePrediction | Produces a prediction for a saved profile | 🟡 | 🟡 | |
| 3.7 | `/pbs` Pbs | Shows current-year + all-time bests; empty state if none | 🟡 | 🟡 | |
| 3.8 | `/calendar` Calendar | Renders sessions; tap a day | 🟡 | 🟡 | |
| 3.9 | `/kanban` TrainingKanban | Drags a card between columns; persists on reload | 🟡 | 🟡 | |
| 3.10 | `/analytics` AdvancedAnalytics | Charts render with data; empty state if none | 🟡 | 🟡 | |

### 3b. Science & physiology tools

| # | Route / flow | Interaction to verify | Sev | Status | Evidence |
|---|---|---|---|---|---|
| 3.11 | `/physiology` | Physiology Lab opens (the Tools dropdown link works on mobile) | 🔴 | 🟡 | |
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