# TrainPaceLab — Product Roadmap

_Endurance intelligence platform — adaptive, data-driven training built on physiological modeling, AI coaching, and wearable ingestion._

## Phase 1 — Foundation (Shipped)
- Core athlete profile + physiology thresholds (HR zones, FTP, threshold pace, VDOT estimate).
- Workout ingestion pipeline (`.fit`/`.csv`) via shared `telemetryParser` + `workoutIngest` with strict sanitize + dedup guards.
- EWMA-based CTL/ATL/TSB engine (`recalculateCTLATLTSB`) with tier-adjusted time constants; results persisted to both `DailyMetrics` and `AthleteProfile`.
- Dashboard: "Pro-Athlete Obsidian" metric banner, Load & Fatigue forecast chart, training calendar, recent workouts, coach message feed.
- AI coach agent + backend functions: training-plan generation, micro-adjustments, post-workout evaluation, race strategy.
- COROS OAuth connection + webhook ingestion.
- Experimental safety pattern: `<WipWrapper>` + `ErrorBoundary` for non-breaking feature rollout.

## Phase 2 — Intelligence & Ingestion (In Progress)
- **Screenshot OCR import** — `parseWorkoutScreenshot` backend function (Core `InvokeLLM` vision pass with a strict `response_json_schema` and per-field confidence flagging) feeding `OcrVerificationModal`: a side-by-side image preview + editable pre-filled form, with `#F59E0B` amber borders on every low-confidence (`< 0.85`) field. Persists through the existing `bulkIngestWorkouts` pipeline + `recalculateCTLATLTSB` refresh.
- **Race Pacing Engine** — `racePacingEngine.ts` pure utility: Minetti grade-adjusted pace (GAP) with a −12% downhill eccentric-braking clamp, Heat Score (Air Temp °F + Dew Point °F) pace penalties across four bands, and 15% start-distance glycogen throttling (start → steady → finish split phases). Mounted on the dashboard inside `<WipWrapper isWip featureName="Race Strategy Engine">`.
- **Recovery data consolidation** — recovery CSV drops and the daily biometric log now UPSERT into `DailyMetrics` (HRV + sleep score), never clobbering computed CTL/ATL/TSB; aerobic baseline tests write to `AthleteProfile` thresholds (`vdot_estimate`, `ftp_watts`, `lactate_threshold_hr`, `resting_hr`).

## Phase 3 — Monetization & Live Sync (Shipped)
- Tiered subscription gating (Free / Pro / Team) backed by Stripe — `stripeCheckout` (iframe-guarded, `base44_app_id` metadata) → `stripeWebhook` provisions the `Subscription` entity → `useSubscription` / `FeatureGate` unlock gated features (`unlimited_sync`, `adaptive_replan`, `structured_export`, `coach_workspace`).
- Hybrid coach model: self-selected Coach mode (nav visibility) + Team plan (functional roster access); admins bypass the paywall.
- Provider-agnostic wearable OAuth (Garmin / Strava / COROS) with HMAC-SHA256-signed `state` to prevent athlete-binding CSRF; historical + webhook ingestion with fuzzy per-day dedup.

## Security & Privacy Hardening (In Progress)

A dedicated track to protect user health data, the builder's IP, and the integrity of paid features. Staged so each step lands safely without locking legitimate users out.

### Stage S1 — Close privilege-escalation on paid & admin entities (Shipped)
RLS `create` rules were left open on several entities, letting any authenticated user forge records that grant access or inject data. Now locked:
- `Subscription.create` → admin only (was open; anyone could self-grant Pro/Team). Provisioning still works via `asServiceRole` webhook (bypasses RLS).
- `WebhookEvent.create` → admin only (blocks idempotency-log pollution).
- `CoachAthleteAssignment.create` → `data.coach_user_id == user.id` OR admin (stops forging roster entries under another coach).

### Stage S2 — Lock wearable connection entities (Shipped)
`GarminConnection`, `StravaConnection`, `CorosConnection` `create` → admin only. These are only ever created by the OAuth callbacks under `asServiceRole`; no client path creates them, so locking prevents a user from injecting a connection bound to another athlete while breaking nothing.

### Stage S3 — Ownership signal through ingestion (Shipped)
Historical-sync functions (`stravaSync`, `garminSync`, `corosSync`) now stamp `created_by_id: athlete.created_by_id` on `WorkoutSession` records at creation time, and the COROS webhook path does the same. This makes the athlete the record owner so future `created_by_id`-based RLS can recognize them. Also fixed a COROS webhook distance bug (`??` / `?:` operator-precedence produced `NaN` distance when `distance_km` was set without `distance_meters`).

### Stage S4 — Extend the ownership stamp to the remaining ingest paths (Planned)
Apply the same `created_by_id` stamping to `ingestWorkoutFile`, `webhookWearableSync`, `workoutWebhook`, `garminWebhook`, and `bulkIngestWorkouts` so every `WorkoutSession` / `WorkoutAsset` record carries the athlete's user id as owner. No RLS change yet — purely additive, zero lockout risk; this completes the foundation S5 depends on.

### Stage S5 — Health-data confidentiality via ownership + roster scoping (Planned — architecture decision required)
Today every authenticated user can read any athlete's health data (`WorkoutSession`, `DailyMetrics`, `TrainingPlan`, `TrainingPlanSession`, `WorkoutFeedback`, `CoachMessage`, `AthleteProfile`), and the Coach "Add athlete" picker enumerates the entire athlete directory. Locking reads to `created_by_id` would break the coach roster (coaches read athletes they didn't create). The proper fix requires an ownership mapping the platform RLS can see:
- Add `athlete_profile_id` (the athlete's own profile) and `coached_athletes` (array of profile ids) to the `User` entity, populated at onboarding and maintained on coach add/remove.
- Apply read RLS like `{ "$or": [ { "data.athlete_id": "{{user.data.athlete_profile_id}}" }, { "data.athlete_id": { "$in": "{{user.data.coached_athletes}}" } }, { "user_condition": { "role": "admin" } } ] }` on athlete-keyed entities, and `{ "id": "{{user.data.athlete_profile_id}}" }` / roster-includes for `AthleteProfile`.
- Scope the Coach picker to the coach's own roster only (ends directory enumeration).
- Requires a one-time backfill (Set `athlete_profile_id` for existing users from their `AthleteProfile.created_by_id`) **before** RLS publishes, to avoid blank dashboards. Admin-with-bypass guarantees the owner never gets locked out during rollout.

### Stage S6 — Algorithm / IP protection (Planned — architecture decision)
The proprietary physiology engines (`src/science/*.ts` — VDOT, threshold-pace, load, race-pacing) currently ship to the browser as client JS bundles, so they're readable by anyone. Options to evaluate: (a) move only the truly proprietary derivations (threshold-pace engine, VDOT auto-derivation, race-pacing) behind backend functions the frontend invokes, keeping real-time UI helpers (pace/zone sliders) client-side; (b) accept bundling since the competitive moat is the adaptive layer + data, not the raw formulas. Recommendation: (a) for the crown-jewel engines only, to limit latency/credit cost.

### Stage S7 — Secrets & live integrations (Blocked on user action)
- Garmin/Strava/COROS API credentials (`*_CLIENT_ID`, `*_CLIENT_SECRET`, `*_API_BASE`, `COROS_WEBHOOK_SECRET`) remain unconfigured — the sync functions already self-report "not configured" gracefully. Paste credentials in Settings → Secrets to light up live syncing (user deferred declaring the slots).
- Stripe sandbox: go to Dashboard → Integrations → Claim Account to take ownership before going live with real payments.

### Stage S8 — Reliability: CI gate on the science test suite (Blocked on a one-time manual commit)
Move the existing vitest suite (`src/science/__tests__`, `src/math/*.test.ts`, `src/services/*.test.ts`) into a `.github/workflows/ci.yml` that fails the build on test failure. The GitHub connector's `repo` scope can't author workflow files, so this needs a single manual commit to the repo.

## Phase 4 — Live Integrations & Polish (Planned)
- Smart Sync Manager — unify Garmin Health / Strava / Wahoo webhook ingestion behind one normalized `TelemetryParser` service.
- Metric visualization overhaul — zone shading (Z1–Z5), crosshair-synced charts, richer CTL/ATL/TSB correlation views.
- Mobile field/track view — one-handed layout, large tap targets, offline-friendly session cards.
- Un-WIP and QA the Recovery Center and Race Strategy Engine once preview QA is available.