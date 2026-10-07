# TrainPaceLab — Roadmap to Beta → Production

_A detailed, sequenced plan from the current published-but-beta state through a closed beta cohort to a public production launch._

---

## Current state snapshot

**Already live:** published at `trainpacelab.base44.app`; Stripe live mode accepting real payments (Pro A$9/mo, active price `PRO_PRICE_ID`); beta access-code provisioning (`redeemAccessCode`); core physiology engine (VDOT, threshold pace, CTL/ATL/TSB via EWMA); workout ingestion (`workoutIngest`, multi-file `streamReconcile`); AI coach agent + plan generation / micro-adjustments / post-workout eval / race strategy; COROS OAuth + webhook ingest; Oura/WHOOP/Polar recovery OAuth; tiered gating (Free/Pro/Coach-Pro-coming-soon); Terms/Privacy/Refund pages.

**Known gaps (evidence-based):**
- TrainingPlan page 500 (Axios) on load — 🟡 code fix landed (`TrainingPlan.jsx` try/catch + null guards); live retest pending.
- Dashboard widgets can crash to blank screens (no per-widget error boundary) — 🟡 `WidgetBoundary` implemented + wrapped in `Home.jsx`; forced-throw retest pending.
- `LoadStatusCards` NaN warnings — ✅ guarded (zero-workout → null; NaN check → null).
- Tools dropdown → Physiology Lab link not firing on mobile/nested nav — 🟡 code fix landed (`ToolsDropdown.jsx` renders LABS as direct links); mobile tap-test pending.
- Service-layer adapter runtime errors (SDK method mappings, connector accessors) — ✅ four SDK-mapping defects fixed + verified; `connectorGateway` has no UI consumer (only `functionGateway` used), Admin routes Airtable via `airtableSync` backend function.
- Orphaned E2E test conversation in AI Coach dashboard — ✅ `CoachMessage` queried live: 0 records, nothing to render.
- Builder-plan backend-function limit (HTTP 403 deploying a 5th function) — ⛔ open (plan decision).
- Health data is readable by any authenticated user (S5 not shipped); coach picker enumerates the whole athlete directory — ✅ S5 RLS published on every athlete-keyed entity + ownership backfill/audit clean (B1.2); coach picker scoped to `CoachAthleteAssignment` roster. Two-account runtime isolation probe still pending.
- Crown-jewel science engines ship to the browser as client JS (S6) — 🔴 open (P1.1).
- Stripe: archived A$19 Pro price + deactivated A$49 Team product left in the account — ✅ cleaned up (B1.3): archived price `active=false`, Team product deleted, 0 subs on old price.
- Garmin/Strava direct sync unconfigured (kept Coming Soon); COROS not yet validated on the published domain.
- Preview-sandbox 403 blocks automated E2E (platform issue).

_Status legend: ✅ done · 🟡 in progress · 🔴 open · ⛔ blocked._

---

# Horizon 1 — BETA

**Goal:** a closed cohort of invited athletes can onboard, sync/log, get an adaptive plan, and pay — without critical crashes or privacy leaks — while we collect structured feedback.

## Beta Phase 0 — Stabilize the core (gate before inviting anyone)

_Land before any tester is invited. Every item is a launch blocker._

- 🟡 **B0.1 Fix TrainingPlan 500.** ✅ Code fix landed: `TrainingPlan.jsx` now wraps the profile+plan load in try/catch, sets a `loadError` state with a Retry button, and null-guards `plan`/`athlete` before render — no uncaught throw can blank the route. The earlier Axios 500 was a defensive-code gap; the page now degrades gracefully. 🔴 **Runtime retest still required:** load `/plan` on the published app for an athlete with and without an existing plan and confirm no 500/blank. **Acceptance:** `/plan` loads for an athlete with and without an existing plan.
- 🟡 **B0.2 Per-widget error boundaries.** ✅ Implemented — added `WidgetBoundary` (`src/components/common/WidgetBoundary.jsx`) and wrapped the 12 unguarded dashboard widgets in `Home.jsx`; each crash is reported to `logErrorToAirtable` keyed by widget name. Pending: live forced-throw verification (preview sandbox 403). **Acceptance:** a forced widget throw shows a graceful fallback card, not a blank screen.
- ✅ **B0.3 `LoadStatusCards` NaN.** Already guarded: zero-workout path returns `null` (line 10–11); render path guards `[ctl,atl,tsb].some(v => typeof v !== "number" || isNaN(v))` → `null` (line 14); `calculateTrimp` never logs. No NaN reaches console or UI for a fresh athlete.
- 🟡 **B0.4 Mobile Physiology Lab nav.** ✅ Code fix landed: `ToolsDropdown.jsx` now renders the `LABS` group (Physiology Lab, Recovery Center) as direct `DropdownMenuItem`→`<Link>` rows — there is no longer a nested sub-trigger to tap through, so the old mobile nested-trigger gap is gone. 🔴 **Runtime retest still required:** tap Physiology Lab from the Tools menu on a 390px viewport on the published app. **Acceptance:** Physiology Lab opens from the Tools menu on a 390px viewport.
- ✅ **B0.5 Service-layer adapter audit.** Verified in source (`src/services/adapters/base44/index.ts`): the four SDK-mapping defects are fixed and documented inline. The `base44ConnectorGateway` still calls `base44.connectors?.Airtable/Github` client-side (connectors are server-side only), **but no UI consumer reads `connectorGateway` from the service context** — only `functionGateway` is consumed (by `CoachBriefing`, `AIDeepDiveCard`); the only Airtable caller (`Admin.jsx`) correctly routes through the `airtableSync` backend function. So no Home/Imports/Settings code path invokes the client-side gateway → no runtime error today. The dead gateway is a latent footgun worth removing in a future cleanup, not a live defect. **Acceptance met:** no adapter runtime errors in console across Home, Imports, Settings.
- ✅ **B0.6 Remove orphaned E2E test conversation.** Queried `CoachMessage` live: **0 records exist** — the leftover test thread is already gone (empty dataset), so nothing can render for a real user. **Acceptance met:** no test conversation renders for a real user.
- ⛔ **B0.7 Builder-plan function-limit decision.** Decide: upgrade the workspace plan, or consolidate backend functions under the limit. **Acceptance:** no 403 when deploying a needed function.

**Beta Phase 0 exit:** smoke pass on the published app — onboard → log/sync a workout → CTL recalc → generate plan → AI coach message → checkout → subscription provisioned.

## Beta Phase 1 — Data privacy & billing integrity

- ✅ **B1.1 S4 — ownership authorization gate on user-auth ingest.** Code audit found `created_by_id` is already stamped correctly on all 5 ingest paths (user-context SDK auto-stamps it for `ingestWorkoutFile`/`bulkIngestWorkouts`; service-role webhook functions stamp `created_by_id: athlete.created_by_id` explicitly). The real gap was a missing **authorization gate**: the two user-auth functions fetched `AthleteProfile.get(athlete_id)` and created records against it without verifying the caller owns that profile. Added `assertOwnsAthlete` (from `base44/shared/ownership.ts`, admin short-circuits) right after the fetch in both `ingestWorkoutFile` and `bulkIngestWorkouts` → 403 "Not your athlete profile" on mismatch. Service-role webhook functions untouched (no user context to gate). **Acceptance:** cross-athlete ingest rejected; admin bypass holds; happy path compiles (verified via test_backend_function). *(403-rejection path not exercised as the test caller is admin — needs a non-admin test account.)*
- ✅ **B1.2 S5 — health-data RLS + linkage backfill/audit.** Read RLS was already published in every athlete-keyed entity (keys on `data.athlete_id === user.data.athlete_profile_id`, not `created_by_id`) — no schema change needed. Ran the existing idempotent `backfillOwnershipMapping` (maps every `AthleteProfile.created_by_id` → owning User's `athlete_profile_id`; builds `coached_athletes` from active `CoachAthleteAssignment` rows). Added new `auditLinkageMapping` function: auto-re-links clear 1:1 cases still missing/mismatched; flags genuinely ambiguous ones (multiple owned + no linkage, zero owned + linked to a non-owned profile, dangling `athlete_profile_id`). First audit run: 3 users, 0 auto-relinked, **0 flagged** → clean dataset, all users correctly linked. **Acceptance:** every user has the `athlete_profile_id` linkage the live RLS keys on; no blank dashboards. *(Two-account RLS isolation probe pending a second test account.)*
- ✅ **B1.3 Stripe cleanup + provisioning verify.** Audited live via Stripe API: **0 subscriptions exist** → nobody grandfathered on the archived A$19 price (`price_1UK8g9E7S43vvkaAkrehHIGA`); it's `active=false` (archived) — Stripe prices aren't hard-deletable via the API (DELETE 404), so archived is the terminal state. Team product + A$49 price already deleted (product returns "No such product"). `PRO_PRICE_ID` env == active A$9 monthly price (`price_1UK9GXE7…`). `stripeWebhook` endpoint (`we_1UK8gBE7…`) registered to `https://trainpacelab.base44.app/functions/stripeWebhook`, `enabled`, 3 events; `STRIPE_WEBHOOK_SECRET` present. **Pending:** end-to-end checkout → subscription event → `Subscription` row → `useSubscription` unlock (needs preview sandbox).
- ✅ **B1.4 Beta access-code flow.** Already built end-to-end: `redeemAccessCode` (generate/list/redeem) provisions a `Subscription` (`granted_plan` + `current_period_end = expires_at`) with an optimistic lock on `used_count` to prevent over-granting past `max_uses`; `AccessCodeManager` (Admin page) generates/copies codes; the Subscribe page hosts the user-facing redeem form. **Verified live:** generated a `max_uses=1` code → redeem succeeded → `Subscription` provisioned `pro/active` with the correct expiry → second redeem rejected (410 use-limit) → an already-expired code rejected (410 expired). Test codes + provisioned subscription cleaned up afterward. **Acceptance met:** redeem grants access; expired code rejected; `used_count`/`max_uses` enforced.

**Beta Phase 1 exit:** privacy isolation proven (two test accounts), billing provisions the correct plan, access codes work.

## Beta Phase 2 — Integration honesty & COROS validation

- 🔴 **B2.1 COROS live-domain validation.** Run connect → historical sync → recovery sync → webhook ingest on `trainpacelab.base44.app` (not preview). **Acceptance:** a real COROS workout appears, recovery populates `DailyMetrics`, a webhook push dedups.
- 🟡 **B2.2 Wearable-honesty sweep.** Audit every surface (onboarding, settings, emails, share copy) against `src/lib/wearableCatalog.js` statuses; no claim of Garmin/Strava direct sync being available today. **Acceptance:** no misleading sync claim anywhere.
- 🟡 **B2.3 Oura/WHOOP/Polar recovery sync.** Confirm `wearableOAuthSync` live + tested per provider; token refresh; `last_sync_at`/`last_error` populated. **Acceptance:** recovery data syncs for each provider; expired tokens refresh.
- 🟡 **B2.4 Garmin/Strava stay Coming Soon.** Keep gated in catalog + UI; do not re-enable until credentials configured and QA'd. **Acceptance:** no live "Connect Garmin/Strava" button that fails.

**Beta Phase 2 exit:** every sync surface tells the truth; COROS round-trips on the prod domain.

## Beta Phase 3 — Observability & feedback loop

- 🟡 **B3.1 Error logging.** Wire `logErrorToAirtable` for frontend (global error handler + widget boundaries) and backend (function catch blocks) with severity. **Acceptance:** a forced error is logged with stack + context.
- 🟡 **B3.2 Analytics funnels.** Instrument `onboarding_complete`, `workout_ingested`, `plan_generated`, `checkout_started`, `subscription_active` via `base44.analytics.track`. **Acceptance:** events appear for a real flow.
- 🟡 **B3.3 Beta feedback channel.** Surface the in-app feedback modal prominently during beta; collect into a triage list. **Acceptance:** testers can submit feedback in ≤2 taps.
- 🟡 **B3.4 Wearable sync health view.** Admin view of `*Connection` `last_sync_at`/`last_error`/`status`. **Acceptance:** admin can see which athletes' syncs are failing.

### Beta exit criteria
- All Beta Phase 0–2 items ✅; observability live.
- 10 invited testers onboarded; **no critical crash for 7 consecutive days**; error rate < 2% of sessions.
- Privacy isolation holds; billing correct; COROS validated on prod domain.

---

# Horizon 2 — PRODUCTION (public launch)

**Goal:** a polished, secure, observable public launch with marketing push.

## Prod Phase 1 — Hardening

- 🔴 **P1.1 S6 — crown-jewel IP to backend.** Move threshold-pace, VDOT auto-derivation, and race-pacing derivations behind backend functions; keep real-time UI helpers client-side. **Acceptance:** proprietary formulas not readable in the client bundle; latency acceptable.
- ⛔ **P1.2 CI gate on science tests.** Move vitest suite into `.github/workflows/ci.yml` failing the build (one manual commit). **Acceptance:** CI red on a broken test, green otherwise.
- 🟡 **P1.3 Rate-limit & credit budget.** Tune sliding-window limits on `aiDeepDive`, `coachBriefing`, `generateTrainingPlan` and the free-tier 5-msg/week cap against beta usage; monitor `InvokeLLM`/`GenerateImage` credit burn. **Acceptance:** free-tier caps enforced; no credit surprise.
- 🟡 **P1.4 Dashboard load profile.** Load-test `Home` (4 parallel entity filters) with large history; add pagination/suspense if slow. **Acceptance:** dashboard loads < 2s at p95 with 500 sessions.
- ⛔ **P1.5 Full E2E QA.** Once preview-sandbox 403 clears, automate: onboarding, ingestion, CTL recalc, plan gen, checkout, webhook→subscription, RLS isolation, access-code redeem, COROS round-trip. **Acceptance:** all critical paths green.

**Prod Phase 1 exit:** CI green; science suite green; load test passed; E2E critical paths green; S6 shipped.

## Prod Phase 2 — Launch assets

- 🟡 **P2.1 Custom domain.** Ask the builder for the connected domain; point user-facing links/SEO at it. **Acceptance:** custom domain serves the app; redirects correct.
- 🟡 **P2.2 SEO.** Finalize `index.html` (title, description, OG image, canonical), sitemap; run the in-platform SEO checklist + AI-search score. **Acceptance:** SEO score acceptable; OG preview correct.
- 🟡 **P2.3 Legal review.** Final review of Terms/Privacy/Refund for a paid health-data product (wearable data, athlete health info, payments, refunds). **Acceptance:** legally signed off.
- 🟡 **P2.4 Pricing copy consistency.** Pro = A$9/mo everywhere (landing, Subscribe, Stripe, access codes); Coach Pro = A$29 Coming Soon. **Acceptance:** no price discrepancy across surfaces.
- 🟡 **P2.5 Support/contact route.** Define the support path; add a reachable contact link in the landing footer. **Acceptance:** users can reach support.
- 🟡 **P2.6 Onboarding & empty-state polish.** Clean onboarding, empty states, and error states for first-time users. **Acceptance:** new user reaches the dashboard with no dead end.

**Prod Phase 2 exit:** domain + SEO + legal + pricing + support all production-ready.

## Prod Phase 3 — Launch & post-launch

- 🟡 **P3.1 Soft launch to waitlist.** Invite the waitlist in batches; watch error/billing/sync dashboards. **Acceptance:** stable for 2 weeks at batch volume.
- 🟡 **P3.2 Monitor health.** Track error rate, billing transitions (`past_due`/churn), wearable sync `error`/`expired`, credit burn. **Acceptance:** dashboards reviewed daily; alerts on spikes.
- 🟡 **P3.3 Iterate on top feedback.** Triage beta/soft-launch feedback; ship the top fixes. **Acceptance:** top-3 issues addressed.
- 🟡 **P3.4 Public launch / marketing push.** Enable Google Ads (in-platform Marketing flow) + social posts; remove any remaining "beta" framing. **Acceptance:** public launch live; metrics stable.

**Prod Phase 3 exit:** 2 weeks stable at public volume; error rate < 1%; churn monitored; marketing live.

---

## Critical path

```
Beta Phase 0 (stability)
   └─► Beta Phase 1 (S5 RLS + Stripe cleanup + access codes)
         └─► Beta Phase 2 (COROS prod validation + honesty sweep)
               └─► Beta exit (10 testers, 7 crash-free days)
                     └─► Prod Phase 1 (S6 IP, CI gate, E2E QA)
                           └─► Prod Phase 2 (domain, SEO, legal, pricing)
                                 └─► Prod Phase 3 (soft launch → public launch)
```

S4 ownership stamp, observability (B3), and CI gate (P1.2) run in parallel and can trail the critical path by one phase. **S5 (health-data RLS + backfill) must land before any broad marketing push** — it's the single biggest privacy gap.

> **Beta verification checklist:** `src/BETA_READINESS_ROADMAP.md` is the pass/fail companion to this roadmap — it turns each phase above into route-grounded checklist items (account/onboarding, privacy, billing, app-wide UX, integrations, support) with expected outcomes, evidence columns, retest rules, go/no-go gates, and staged cohorts (C0→C3). This file tracks what to build/fix; that one tracks what to prove with fresh evidence before any cohort advances.

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Preview-sandbox 403 blocks automated E2E | QA slows | QA by hand on published app; retry platform tooling each turn |
| Builder-plan function limit (403) | Can't ship new backend functions | Upgrade plan or consolidate functions (B0.7) |
| Grandfathered $19 subscribers | Incorrect billing | Check active subscriptions before deleting the archived price (B1.3) |
| Garmin/Strava credential dependency | Sync features stay gated | Keep Coming Soon; no promise of availability (B2.4) |
| RLS backfill race on publish | Blank dashboards | Backfill before publish; admin bypass guarantees owner access (B1.2) |
| Crown-jewel IP exposed in client bundle | Competitor copy | Move to backend functions (P1.1) |