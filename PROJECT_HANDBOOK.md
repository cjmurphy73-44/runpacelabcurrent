# TrainPaceLab: Project Handbook

A working reference for anyone (human or agent) picking this repo up: what the product is,
how it got here, how the code is laid out, how work flows from edit to production, and what
still stands between "works" and "excellent".

Last updated: 2026-11-08

---

## 1. What this product is

TrainPaceLab is an endurance training intelligence platform. An athlete (or their coach)
connects a watch, uploads files, or logs sessions by hand. The app then does three things
that trainers usually charge money for:

1. **Measures** every session and day in a reproducible way (load, zones, physiology).
2. **Explains** what that means right now (readiness, form, injury risk, fuel).
3. **Prescribes** what to do next, and adapts when reality deviates.

The positioning is deliberately unglamorous: neutral, evidence-based, maths-forward. No
black-box "AI magic", no motivational fluff, no invented metrics. Every number on screen
should be traceable to a formula with a citation (`src/science/CITATIONS.md`) or to a file
the athlete supplied.

**Live:** https://trainpacelab.com (also https://trainpacelab.base44.app)
**Platform:** Base44 (React + Vite frontend, BaaS backend: entities, functions, workflows)

---

## 2. Project history

The app was built in layers, and each layer exists because the previous one exposed a gap.
Reading this in order explains most of the odd-looking decisions in the code.

### Phase 1: Physiology core (the foundation)

Started as a calculator, not a tracker: VDOT, pace zones, HR zones from Karvonen, race
prediction. The goal was correctness first. This is why `src/science/` holds pure,
dependency-free functions with unit tests, and why `base44/shared/` mirrors the same maths
for server use. Nothing about the athlete's data touches the UI before it has been computed
by a tested module.

Key inherited decision: **the science layer never imports React or the SDK.** If a
calculation is not pure, it lives in a hook or a component instead.

### Phase 2: Training load and the two-model philosophy

CTL/ATL/TSB arrived as EWMA (the familiar model, `tau = 42/7` by default). It was kept, but
not trusted alone: a two-compartment Banister ODE (`src/science/models/fitnessFatigueOde.ts`)
was added alongside it, with per-athlete time constants editable in the Physiology Lab. Both
models now run on every recalculation and the athlete can compare them. This "show both, let
the athlete calibrate" pattern recurs throughout the app.

Also from this phase: TRIMP for sessions without power, rTSS fallback from Normalized Graded
Pace, aerobic decoupling (Pa:HR), and sport-specific normalisation (Coggan NP for cycling,
Minetti grade-adjusted speed for running, CSS for swimming).

### Phase 3: Ingestion, and the stream problem

Wearable integration started with imports: FIT, TCX, CSV, plus a manual wizard and an OCR
path for screenshots of a watch summary. Then came device sync: Garmin (OAuth), COROS (OAuth
+ MCP), Strava (OAuth + webhooks), and a generic OAuth pipeline for Oura, WHOOP, Withings,
Polar, Fitbit, Suunto.

The hard lesson of this phase: **a summary record is not data.** Providers hand you average
HR and total time; zone distribution, decoupling and interval analysis all need
second-by-second samples. An early compromise silently estimated zones from average HR, which
produced confident-looking charts built on nothing. That was removed.

The rule that replaced it, and that governs the codebase today:

> Zone analytics, time-in-zone, and distribution charts render only from a verified
> per-second stream. No stream means the panel says so instead of drawing a guess.

Enforcement lives in `src/lib/streamValidity.js` / `base44/shared/streamValidity.ts`
(minute-long minimum, dense timestamps, a real HR or power channel), and in the
`zone_method` field on `WorkoutSession` (`stream | laps | average | none`).

Related pivot: pace-band gating was abandoned. Filtering runs by Daniels bands created a
circular dependency where a run needed a valid pace to be valid. Intensity gating now uses
heart rate reserve instead.

### Phase 4: Planning and the AI coach

`TrainingPlan` (macrocycles, weekly plans, nutrition, HRV framework, injury red flags) and
`TrainingPlanSession` (per-day prescription with structured steps) were built next, then the
LLM layer: an in-app agent (`base44/agents/early_version_ai_coach.jsonc`) with tool access to
plan generation, micro-adjustment, race strategy, and post-workout evaluation.

The architectural decision that makes this trustworthy: **the AI never computes.** Every
prompt is prefixed with a structured `AthleteStateSummary` produced by the deterministic
engine (`src/science/athleteState.ts` → `base44/shared/athleteState.ts`). The model reads a
fixed set of numbers and writes prose around them. If the summary is wrong, the fix is in the
engine, not in the prompt.

### Phase 5: Money, entitlements, and the B2B edge

Stripe arrived with three tiers (Pro $9, Unlimited $19, Coach Pro $29), a webhook-driven
`Subscription` entity, a billing portal, and access codes for beta testers. Server-side
authority is absolute: entitlements are written only by `stripeWebhook` and `redeemAccessCode`
running as service role. `base44/shared/planGate.ts` gates the gated features.

Coach tooling followed: `CoachAthleteAssignment`, a roster, comparison views, and per-athlete
plan assignment. Coaches read athletes they are explicitly assigned to, nothing more.

### Phase 6: Hardening (current phase)

The last stretch has been about not lying, not double counting, and not leaking:

- Deduplication on ingest (`WebhookEvent` idempotency, duration and distance matching).
- Constant-time HMAC comparison for webhook signatures.
- URL guards before fetching any user-supplied file (`base44/shared/urlGuard.ts`).
- Batched entity reads on sync to stay under the 140 requests/minute entity limit.
- Ownership backfill so records created before RLS tightening still resolve to an owner.
- Telemetry validity gates in front of every analytics surface.
- COROS refactor: the MCP sport record is a summary, so the original activity file is now
  downloaded for every new session at ingest, and the same refetch was added to the
  historical backfill. Both share `base44/shared/corosMcp.ts`.

### Recurring decisions worth remembering

| Decision | Why |
| --- | --- |
| Pure science modules, duplicated intentionally across `src/science` and `base44/shared` | A build break once proved that frontend code cannot import backend modules. The duplication is deliberate and tested on the frontend side. |
| Both EWMA and ODE load models | Single-model output invites over-trust; two models with editable constants invite calibration. |
| Streams required for zones | Estimated zones contaminated every downstream chart. |
| No marketing claims about "AI-free" or "AI slop" | Neutral, evidence-based copy only. |
| No em dashes in copy | House style, keeps prose human and consistent. |
| Server-side authority for entitlements | Client state is a display concern, never an entitlement. |
| Mobile-first, single-scroll dashboards | Athletes check this on a phone, often standing up. |

---

## 3. Architecture at a glance

```
React SPA (src/)
   pages  ──► components ──► hooks ──► services
     │                         │
     └──────► src/science (pure functions, unit tested)
     │
     └──────► Base44 SDK ──► entities (RLS-scoped data)
                       ──► functions (Deno, service role when needed)
                       ──► workflows (schedules, mirrored Airtable)
                       ──► integrations (Core LLM, file upload)
                                   │
        Garmin · COROS (MCP) · Strava · Oura/WHOOP/Polar/Withings/Fitbit/Suunto
        Stripe · Airtable · GitHub (dev tooling)
```

Three layers, one direction of trust: UI reads, functions write, science decides.

---

## 4. Codebase map

### 4.1 Frontend (`src/`)

| Path | Role |
| --- | --- |
| `src/pages/` | 35 route-level screens. `Landing` is the public page; everything else sits behind auth under `/app`, `/workouts`, `/plan`, etc. |
| `src/components/layout/` | `AppLayout`, `Header`, `MobileNav`, `MobileTabBar`, `ToolsDropdown`, `navItems.js` (single source of navigation truth). |
| `src/components/dashboard/` | The home screen's widgets: readiness, load cards, recovery lab, physiology strip, coach briefing, timeline, quick actions. |
| `src/components/workout/` | Session detail: modal, zone panel, splits, fitness impact, edit and manual entry. |
| `src/components/analytics/` | Histograms, trends, compliance heatmap, taper calculator, anomaly banner. |
| `src/components/settings/` | Per-provider connection cards and health states. |
| `src/components/imports/` | Upload, OCR, telemetry drawer, webhook setup guides. |
| `src/science/` | Pure engine: vdot, daniels, zones, trimp, load, decoupling, readiness, injury, race prediction, ODE, Coggan, Minetti, Banister, adaptive/novice baselines, environment. |
| `src/lib/` | Cross-cutting helpers: `streamValidity`, `personalBests`, `coachBriefing`, `wearableCatalog`, `subscriptionFeatures`, `glossary`, `terminology`, `injuryEngine`, `fitSummaryParser`. |
| `src/hooks/` | Data and state: `useAthlete`, `useSubscription`, `useCoachAccess`, `useTelemetry*`, `useReadinessHistory`, `usePaceCalibration`, `useNorwegianWorkouts`. |
| `src/services/` | Provider-agnostic layer: contracts, adapters (Base44, memory), telemetry processors, offline sync queue. |
| `src/context/`, `src/store/` | `AuthContext`, `UIPreferencesContext`, `FitnessContext`, zustand telemetry store. |
| `src/constants/` | Zone colors, theme tokens, onboarding copy. |

Conventions that matter: token classes only (`bg-primary`, `text-muted-foreground`), no
hardcoded hex in JSX, `@/` imports, shadcn primitives from `@/components/ui`, lucide icons
only, one component per file.

### 4.2 Backend (`base44/`)

**Entities (20).** Grouped by concern:

- Identity: `AthleteProfile`, `User` (built-in), `AthleteInvite`, `CoachAthleteAssignment`.
- Training: `WorkoutSession`, `WorkoutAsset`, `TrainingPlan`, `TrainingPlanSession`.
- Physiology and recovery: `DailyMetrics`, `LabResult`, `WorkoutFeedback`.
- Connections: `GarminConnection`, `CorosConnection`, `StravaConnection`, `WearableConnection`.
- Commercial: `Subscription`, `AccessCode`.
- Operations: `WebhookEvent`, `BetaFeedback`, `CoachMessage`.

**Functions (48 modules).** Grouped:

- Sync: `garminSync`, `garminWebhook`, `corosSync`, `stravaSync`, `wearableOAuthSync`,
  `webhookWearableSync`, `workoutWebhook`.
- Ingest: `ingestWorkoutFile`, `bulkIngestWorkouts`, `parseWorkoutScreenshot`,
  `parseRecoveryScreenshot`, `ingestLabResult`, `editWorkoutSession`.
- Maths: `calculateTrainingLoad`, `calculateVDOT`, `calculateDailyTRIMP`,
  `recalculateCTLATLTSB`, `calculateBanisterModel`, `physiologyCompute`, `testMathPipeline`.
- AI: `generateTrainingPlan`, `requestMicroadjustment`, `generateRaceStrategy`,
  `postWorkoutAIEvaluation`, `coachBriefing`, `aiDeepDive`, `synthesizeExceptions`,
  `autoReplanOnDeviation`.
- Commerce: `stripeCheckout`, `stripeTestCheckout`, `stripeWebhook`, `stripeBillingPortal`,
  `redeemAccessCode`.
- Ops: `backfillTelemetry`, `refreshTelemetryState`, `backfillOwnershipMapping`,
  `auditLinkageMapping`, `resetAthleteData`, `deleteAccount`, `ownerDashboard`,
  `logErrorToAirtable`, `logBetaFeedback`, `airtableSync`.

**Shared modules (`base44/shared/`, 33 files).** The server-side science and plumbing. Any
logic used by two or more functions lives here, never copied: `corosMcp`, `garminAuth`,
`oauth`, `workoutParsers`, `streamReconcile`, `streamValidity`, `workoutIngest`, `hrZones`,
`physiology`, `ctlRecalc`, `fitnessFatigueOde`, `readiness`, `calories`, `recoveryIngest`,
`athleteState`, `planGate`, `planValidation`, `ownership`, `rateLimit`, `crypto`,
`urlGuard`, `importLimit`, `anomalyDetect`, `timelineReconciler`, `pushNotifications`.

**Workflows (2).** `COROS Auto Sync` (scheduled sync + recovery pull) and
`Airtable App Mirror` (external reporting mirror).

**Agent (1).** `early_version_ai_coach`, scoped to the four plan/evaluation tools.

**Emails (1).** `CorosReconnect.html`, the token-expiry recovery mail. Brand tokens for all
mail are defined in the system prompt theme and must match the live site.

### 4.3 The three pure engines

1. **Load** (`science/load.ts`, `shared/ctlRecalc.ts`, `science/models/fitnessFatigueOde.ts`):
   EWMA plus two-compartment ODE, recomputed forward from the athlete's own history so a
   late-arriving session cannot silently corrupt prior days.
2. **Intensity** (`science/zones.ts`, `shared/hrZones.ts`): Karvonen floors from resting and
   max HR, snapshotted onto each session as `zone_bounds_bpm` so a later HR change never
   rewrites history.
3. **State** (`science/readiness.ts`, `science/athleteState.ts`): a provider-agnostic
   readiness score from recovery signals, rolling baselines, and current TSB. This is the
   object the AI reads.

---

## 5. Data model and security

**Ownership.** Every athlete-scoped entity is read through RLS keyed on
`user.data.athlete_profile_id`, `coach_athletes`, or `role = admin`. Writes are limited to
`created_by_id = {{user.id}}` or admin. Connection entities holding OAuth tokens are
creator-only. `WebhookEvent` and `AccessCode` are admin-only.

**Entitlements.** `Subscription` is written only by service role from a verified Stripe
event (paid status plus matching amount) or a redeemed access code. `checkout.session.completed`
alone is not treated as payment. Base44 self-test sessions (`base44_test_checkout: "true"`)
are skipped.

**Idempotency.** `WebhookEvent.event_id` (`provider:object:aspect`) blocks replay. Session
duplication is additionally caught by same-day sport/duration/distance matching.

**File safety.** User and provider file URLs pass `assertSafeFileUrl` before any fetch.
Uploads that belong to the athlete are stored privately (`UploadPrivateFile`), and anything
shown in the app is served through signed URLs or the `Image` component.

---

## 6. Development pipeline

**Repository.** This repo is the source of truth; pushes sync into the Base44 Builder and
vice versa. Backend functions deploy from `base44/functions/**`, workflows from
`base44/workflows/*.jsonc`.

**Local loop.**

```bash
npm install
base44 dev          # backend + frontend together (preferred)
npm run dev         # frontend only, against the hosted backend
```

**Quality gates** (also enforced in CI on push and PR to `main`/`master`/`dev`):

```bash
npm run typecheck   # tsc over jsconfig
npm test            # vitest: science golden cases, physiology, parsers, schemas
npm run lint        # eslint --quiet
npm run test:report # human-readable vitest summary
```

**Deployment.** The Publish button in the Base44 editor is the only release step. There is no
separate deploy command. Publishing ships the frontend, functions, workflows, and entity
schemas together.

**Secrets.** Set in the dashboard Secrets page, read via `Deno.env` in functions:
`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `COROS_MCP_CLIENT_ID`,
`GARMIN_*`, price IDs, `WEBHOOK_SYNC_SECRET`, plus test-mode equivalents.

**Observability.** Runtime logs live in the dashboard Logs page. `logErrorToAirtable` and
`base44/shared/errorReport.ts` push failures to the ops base for triage. Workflow run history
is inspectable per run.

**Operational tasks.**

- Historical telemetry recovery: invoke `backfillTelemetry` with `{ athlete_id, cursor }` and
  continue until `has_more` is false. It re-parses stored files, then refetches from Garmin,
  then refetches from COROS, and leaves anything unrecoverable as `summary_only`.
- Ownership repair: `backfillOwnershipMapping`.
- Load recomputation: `recalculateCTLATLTSB` after any bulk correction.
- Beta feedback: `BetaFeedback` entity, admin-triaged.

**Working conventions.**

- Keep components under ~50 lines; split rather than grow a page.
- Never edit `src/lib/authMfa*.js` or the seeded auth pages unless the request is about auth.
- Add a pure function to `src/science` with a test before wiring it into UI.
- Server logic used twice goes to `base44/shared`.
- Batch entity reads; never loop one-call-per-record over an unbounded list.
- Preserve provenance: if a number is estimated, store and show that it is.

---

## 7. What is left to make this excellent

Ordered by user-visible payoff, not by engineering comfort.

### A. Friction: fewer steps to the first useful screen

1. **Onboarding that ends with data in place.** Today the flow collects identity, hardware,
   and baseline, then often lands on an empty dashboard. It should end on either a successful
   first sync or a single upload, with a visible "you're done" state. Target: median new user
   sees a populated readiness card inside five minutes.
2. **Connection honesty.** Oura, WHOOP, Polar, Withings, Fitbit, Suunto and Strava OAuth
   buttons are present but the server-side activation is incomplete. Either finish
   `wearableOAuthSync` per provider or label them "coming soon" instead of letting a tap fail.
   Silent dead ends are the single biggest trust cost in the app.
3. **The stream gap, answered in place.** Where a session has no per-second data, the panel
   already refuses to invent zones. Add the action next to it: "add the recording file" with
   a drop zone, and a one-line reason. Convert a dead end into a fix in one tap.
4. **A search/command surface.** 35 routes is a lot on a phone. A single "jump to" control
   (⌘K on desktop, a pill in the mobile tab bar) removes most navigation hunting.
5. **Fewer competing numbers.** The dashboard shows several load and form values at once.
   Choose one primary per region and push the rest one level down behind "compare models".
6. **Every empty and error state gets one primary action.** Audit for panels that explain a
   problem without offering the fix.
7. **Save-less flows.** Manual entry should autosave drafts; the wizard currently loses work
   on a back gesture.

### B. Brand: identity and imagery

8. **A real logo.** The current mark is a placeholder-scale asset. It needs: a wordmark and a
   monogram that survive at 16px, a horizontal lockup for the header, a square avatar for
   social, and a one-colour version for the email header band. Deliver as SVG plus PNG
   exports at 16/32/64/180/512.
9. **Favicon and app icons.** `public/manifest.json` references assets that do not fully
   resolve, which is why install prompts and iOS home-screen icons look broken. Ship a
   complete set: favicon, 180 apple-touch-icon, 192/512 maskable icons, plus `theme-color`
   matching `#121212`.
10. **Open Graph and social cards.** One 1200×630 image with the tagline, used on the landing
    page and in link previews, plus per-page titles and descriptions.
11. **Landing imagery that earns its space.** Replace abstract gradients with three concrete
    visuals: a hero showing the dashboard on a phone, one showing a real session's zone and
    interval analysis, and one showing the readiness/plan decision. Real screenshots beat
    stock athletic photos, and they double as product proof.
12. **Photography, if used at all.** One or two neutral, non-stock-looking endurance images
    (dawn run, pool deck, trainer), desaturated to the palette. Avoid the smiling-runner
    cliché; it reads as a fitness app, not a lab.
13. **Email lockup.** Every mail should open with the same logo and wordmark band as the
    system mails, using the tokens already defined.

### C. Reliability and technical debt

14. **Distributed rate limiting.** `rateLimit.ts` is per-worker in memory, so limits reset and
    do not compose across instances. Move counters to an entity or a shared store.
15. **Stripe webhook idempotency in the handler itself.** `WebhookEvent` exists and is used
    elsewhere; the Stripe path should write it before provisioning.
16. **End-to-end sync verification.** Garmin and COROS health is currently asserted, not
    measured. Add a nightly workflow that runs a status check per connected athlete and
    surfaces failures in `ConnectionStatusBanner` with a one-click re-auth.
17. **Custom domain and DNS verification** for `trainpacelab.com`, so the primary URL is not
    the `base44.app` host.
18. **Mobile navigation in split-screen.** Reported scroll failure on narrow, short viewports.
19. **NaN hardening.** Uninitialised telemetry inputs can propagate NaN into displayed
    metrics. Clamp at the engine boundary, not in each widget.
20. **CI on TypeScript.** `typecheck` currently surfaces errors in older components; finish the
    migration so the gate is meaningful rather than noisy.

### D. Intelligence and product depth

21. **Coaching loop closure.** Plans exist, post-workout evaluation exists; the missing piece
    is a visible weekly review that states what changed and why, with an accept/reject.
22. **Coach workspace polish.** Roster is functional; add bulk plan assignment, comments, and
    a shared calendar view to make the Coach Pro tier feel priced correctly.
23. **Deeper recovery interpretation.** HRV baselines exist but trend language is thin. A
    rolling comparison against the athlete's own 60-day band is the highest-value addition.
24. **Injury model transparency.** Show which signals triggered a flag, and what to do about
    each, in plain language.

### E. Growth and trust

25. **Proof on the landing page.** Three real outputs (a plan, a session analysis, a readiness
    decision) with the maths visible on hover or expand.
26. **Pricing clarity.** One table, one recommended tier, explicit "cancel anytime", and a
    visible free ceiling.
27. **Data-sovereignty page content.** Export, delete, and what is never shared. This is a
    stated differentiator and deserves real copy rather than a bullet list.
28. **Accessibility pass.** Focus order in modals, contrast on muted text over dark surfaces,
    and reduced-motion coverage for the reveal animations.

### Definition of excellent

A new athlete connects a watch, sees their real session analysis within minutes, understands
one number without reading a guide, and can export or delete everything in two taps. A
returning athlete opens the app, sees one clear decision for today, and closes it. Nothing on
screen is estimated without saying so.

---

## 8. Known issues and debt register

| Area | Issue | State |
| --- | --- | --- |
| Ingestion | Summary-only sessions have no zones | By design. Fix path is refetch plus upload action. |
| COROS | Historical sessions created before the FIT refactor | Recoverable via `backfillTelemetry`. |
| Sync | Garmin and COROS end-to-end health | Unverified in production. |
| Rate limiting | Per-worker memory | Needs shared store. |
| Stripe | No event-id idempotency in handler | `WebhookEvent` available, not wired. |
| PWA | Manifest icon set incomplete | Pending brand assets. |
| Domain | DNS verification for custom domain | Pending. |
| Mobile | Nav scroll in split-screen | Open. |
| Types | Typecheck errors in legacy components | In progress. |
| Ownership | Pre-RLS records | Backfill script exists. |

---

## 9. Where to start reading the code

If you have ten minutes: `src/science/athleteState.ts` (what the app knows),
`base44/shared/workoutIngest.ts` (how data arrives), `src/components/dashboard/ReadinessScoreCard.jsx`
(how it is presented). Those three files carry the product's logic, presentation, and honesty
rules better than any other combination.