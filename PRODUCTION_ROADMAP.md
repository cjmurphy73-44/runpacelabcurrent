# TrainPaceLab — Production Readiness Roadmap

_Goal: move from the current published-but-beta state to a confident public launch._
_Status legend: ✅ done · 🟡 in progress · 🔴 open · ⛔ blocked._

The app is already live at `trainpacelab.base44.app` and accepting real Stripe payments, so "production" here means **launch-ready**: stable, secure, honest, observable, and free of the known crashes. Tracks are ordered by launch risk; P0 are launch blockers.

---

## P0 — Launch blockers (fix before any public push)

These are user-visible failures reported during the beta; each one breaks a core flow.

- 🔴 **TrainingPlan page 500 (Axios)** — `TrainingPlan.jsx` throws a 500 on load. Reproduce via the live route, read the failing request, and fix the data shape / endpoint. Blocks the single most important paid feature.
- 🔴 **Dashboard widget runtime crashes → blank screens** — several dashboard widgets can crash to a blank card. Wrap each widget in the existing `PageErrorBoundary` / `WipWrapper` fallback so one bad card never blanks the whole dashboard; fix the root exceptions surfaced in logs.
- 🔴 **`LoadStatusCards` NaN warnings** — guard divide-by-zero / missing-field cases so load status renders real numbers, not `NaN`.
- 🔴 **Tools dropdown → Physiology Lab link not firing on mobile/nested nav** — the nested-nav trigger doesn't open on mobile. Fix the mobile tap target / nested-menu interaction.
- 🟡 **Service-layer adapter runtime errors** — incorrect SDK method mappings and connector accessors in the service adapters. Audit `src/services/adapters/base44/index.ts` against the live SDK shape and the connector connection accessor (`getConnection`).
- 🟡 **Orphaned E2E test conversation in AI Coach dashboard** — remove the leftover test thread from the coach chat data.
- ⛔ **Builder-plan backend-function limit (HTTP 403 on a 5th function)** — the plan caps deployed functions. Decision needed: upgrade the workspace plan, or consolidate functions so the count fits the limit. Blocks any new backend function.

## P1 — Security & data integrity (before launch)

- 🟡 **S4 — Ownership stamp across all ingest paths** — stamp `created_by_id` on `WorkoutSession`/`WorkoutAsset` in `ingestWorkoutFile`, `webhookWearableSync`, `workoutWebhook`, `garminWebhook`, `bulkIngestWorkouts`. Additive only, no lockout risk; completes the foundation S5 needs.
- 🔴 **S5 — Health-data confidentiality via ownership + roster scoping** — today any authenticated user can read any athlete's health data, and the coach picker enumerates the whole athlete directory. Ship the `athlete_profile_id` + `coached_athletes` user fields, apply read RLS on athlete-keyed entities, scope the coach picker to the coach's roster, and run the one-time backfill **before** RLS publishes. This is the single biggest privacy gap.
- 🔴 **S6 — Crown-jewel algorithm IP** — the proprietary physiology engines ship to the browser as client JS. Move the threshold-pace, VDOT auto-derivation, and race-pacing derivations behind backend functions the frontend invokes; keep real-time UI helpers client-side.
- 🟡 **Stripe cleanup** — (a) confirm no subscriptions are grandfathered on the archived **A$19** Pro price (`price_1UK8g9…`); if none, delete it. (b) Delete the deactivated **Team** product (`prod_VAQch6BqM0xP8K`) and its A$49 archived price. (c) Confirm `PRO_PRICE_ID` resolves to the active A$9 price and the pricing UI matches. ✅ Checkout already binds to the authenticated user (`stripeCheckout` uses `auth.me()` + `client_reference_id` + metadata).
- 🟡 **Webhook integrity** — confirm the `stripeWebhook` endpoint is registered to the published domain (`https://trainpacelab.base44.app/functions/stripeWebhook`) with a valid `STRIPE_WEBHOOK_SECRET`, and that `workoutWebhook` verifies HMAC signatures + dedups via `WebhookEvent`.
- 🟡 **Secrets audit** — confirm all live secrets are set and not stale: `STRIPE_*`, `COROS_*`, `WEBHOOK_SYNC_SECRET`. Rotate anything reused across test/live.

## P2 — Integration honesty & completion

- 🔴 **COROS OAuth — final validation on the published domain** — run the full connect → historical sync → recovery sync → webhook ingest path on `trainpacelab.base44.app`, not preview.
- 🟡 **Garmin & Strava** — keep gated as **Coming Soon** in catalog and UI (already done on landing + home). Do not re-enable until credentials are configured and the sync path is QA'd end-to-end.
- 🟡 **Generic wearable OAuth (Oura / WHOOP / Polar)** — confirm `wearableOAuthSync` recovery sync is live and tested for each provider; verify token refresh + `last_sync_at`/`last_error` reporting.
- 🔴 **Wearable messaging honesty sweep** — ensure no remaining surface (onboarding, settings, emails, share copy) implies Garmin/Strava direct sync is available today. Single source of truth = `src/lib/wearableCatalog.js` statuses.

## P3 — Reliability & QA

- ⛔ **CI gate on the science test suite (S8)** — move the existing vitest suite (`src/science/__tests__`, `src/math/*.test.ts`, `src/services/*.test.ts`) into `.github/workflows/ci.yml` that fails the build on failure. Needs one manual commit (the GitHub connector can't author workflow files).
- ⛔ **End-to-end QA blocked on preview-sandbox 403** — the platform preview sandbox returns 403, blocking automated E2E of onboarding, ingestion, CTL recalc, plan generation, checkout, and webhook→subscription provisioning. Unblocks once the platform issue clears; meanwhile QA by hand on the published app.
- 🟡 **Error monitoring** — wire `logErrorToAirtable` for both frontend and backend errors with severity, and set up alerting on spikes.
- 🟡 **Dashboard load profile** — `Home` fires 4 parallel entity filters on mount; load-test with a large history and add pagination / suspense skeletons if slow.
- 🟡 **HMR/dev-server stale-bundle issues** (Imports/Home) — confirm resolved in the published build; if not, add cache-busting / versioned imports.

## P4 — Launch / go-to-market readiness

- 🟡 **Custom domain** — ask the builder for the connected custom domain and point user-facing links/SEO at it; update `index.html` canonical + OG tags.
- 🟡 **SEO & marketing** — finalize `index.html` meta (title, description, OG image, sitemap), and run the in-platform SEO checklist + AI-search score.
- ✅ **Legal pages** — Terms / Privacy / Refund exist; do a final legal review for a paid health-data product (especially around wearable data and athlete health info).
- 🟡 **Pricing copy consistency** — Pro = A$9/mo everywhere; Coach Pro = A$29 "Coming Soon"; ensure Subscribe page, landing, and Stripe all agree.
- 🟡 **Beta access-code flow** — test `redeemAccessCode` end-to-end (admin creates code → tester redeems → Subscription provisioned → features unlock → expiry enforced).
- 🟡 **Support / contact path** — define how users reach support (in-app feedback modal exists; add a reachable contact route on the landing footer).

## P5 — Post-launch observability

- 🟡 **Analytics** — instrument key funnels (`onboarding_complete`, `workout_ingested`, `plan_generated`, `checkout_started`, `subscription_active`) via `base44.analytics.track`.
- 🟡 **Billing health** — monitor subscription status transitions, failed payments (`past_due`), and churn.
- 🟡 **Wearable sync health** — surface `last_sync_at` / `last_error` / `status` per `*Connection` in an admin view; alert on sustained `error`/`expired`.
- 🟡 **Credit & rate-limit budget** — monitor `InvokeLLM` / GenerateImage credit burn and the sliding-window rate limits on `aiDeepDive`, `coachBriefing`, `generateTrainingPlan`; tune the free-tier 5-messages/week cap against real usage.

---

### Critical path to launch
P0 (stability) → S5 (health-data RLS + backfill) → Stripe cleanup → COROS validation on prod domain → wearable-honesty sweep → manual E2E on the published app → custom domain + SEO → launch. S4, S6, CI gate, and observability run in parallel and can land in the first post-launch iteration if needed, but S5 should land **before** any broad marketing push.