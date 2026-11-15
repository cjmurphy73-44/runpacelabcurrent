# TrainPaceLab: MVP Roadmap

**Purpose.** Get Garmin and COROS athletes onto TrainPaceLab with no friction, give them data they can trust, and give them a coaching loop worth paying for. This file is the authoritative sequencing layer for the MVP phase. It replaces the risk-first ordering in `NEXT_PHASE_ROADMAP.md` (which stays as a traceability and status appendix) and pulls detail from `ROADMAP.md`, `PRODUCTION_ROADMAP.md`, `src/PRODUCTION_ROADMAP.md`, and `src/BETA_READINESS_ROADMAP.md`.

Three decisions shape everything below:

1. **Separate load models.** Verified-stream load and summary-derived load are stored, aggregated and displayed as distinct things. Summary sessions stay in activity history and may carry a clearly labelled load, but they never become stream analytics.
2. **Separate staging is available but isolation remains a release gate.** The staging application has been identified separately from the production domain; this is not proof that every Preview build, backend entity, webhook, OAuth credential, or billing setting points at staging. Synthetic writes and destructive tests are prohibited until their destination and isolation are explicitly verified. Production is for non-destructive smoke checks and separately approved live acceptance only.
3. **MVP value first.** Sequence by athlete-visible value and revenue risk, not by the original seven-PR directive order.

Status legend: ✅ done and evidenced · 🟡 partly done or unverified · ❌ not started · ⛔ blocked.

---

## 1. What the codebase already does well (do not rebuild)

| Capability | Where | Status |
|---|---|---|
| No synthetic zones | `base44/shared/hrZones.ts` returns `zone_method: 'none'` with empty zones when no stream exists; `laps` and `avgHr` are accepted only for call-site compatibility and never used to manufacture a split | ✅ |
| Stream-eligibility gate | `base44/shared/streamValidity.ts` (backend) and `src/lib/streamValidity.js` (frontend), consumed by `PowerPaceHistograms`, `WorkoutZonePanel`, `workoutAnalytics`, `corosSync` | ✅ |
| FIT/TCX/CSV parsing with laps | `base44/shared/workoutParsers.ts`, `streamReconcile.ts`, `src/lib/fitSummaryParser.js` | 🟡 |
| Multi-asset reconciliation ladder | `WorkoutAsset` (FIT 4 > TCX 3 > CSV 2 > manual 1), `backfillTelemetry` recovers streams for historical sessions | ✅ |
| Duplicate suppression on ingest | `corosSync`, `workoutWebhook`, `bulkIngestWorkouts` compare sport, duration and distance per date | 🟡 |
| Webhook idempotency for Stripe | `stripeWebhook` keys `WebhookEvent.event_id = stripe:<event.id>` before processing | ✅ |
| Signed-webhook auth for COROS | `constantTimeEqual` HMAC comparison, no `!=` | ✅ |
| Entity RLS on athlete data | `WorkoutSession`, `DailyMetrics`, `LabResult`, `TrainingPlan`, `WorkoutFeedback`, `CoachMessage` scope on `athlete_id` plus admin | ✅ |
| Account deletion | `deleteAccount` clears 15 entity sets then the User record | 🟡 |

The foundation is stronger than the directive assumes. The gaps are narrower and more specific than "ingestion is broken".

---

## 2. Audit findings that drive the plan

**A1. Load models are blended today (the core directive requirement is not met).**
`calculateDailyTRIMP` (`base44/functions/calculateDailyTRIMP/entry.ts:23`) sums `session_trimp || session_tss` into one `total_trimp`. `base44/shared/ctlRecalc.ts:35` repeats the same rule. Four independent writers (`ingestWorkoutFile:124-126`, `calculateDailyTRIMP`, `ctlRecalc:110`, `bulkIngestWorkouts`) all produce that one number, and every dashboard surface reads it (`FitnessTrendCharts`, `PhysiologyStrip`, `OdeModelChart`, `WeeklySummary`, `loadForecasting`). A COROS summary with no file therefore contributes to CTL/ATL/TSB indistinguishably from a verified-stream run. The no-synthetic-*zones* rule holds; the no-synthetic-*load* rule does not exist yet.

**A2. Zone purity is enforced but only for zones.** The danger in the directive ("purge summary sessions from physiological models") does not apply to zones, because zones are already dropped. It applies to load, which is why A1 is the real work item.

**A3. COROS sessions can legitimately be summary-only.** `corosSync` attempts a FIT download per session and, when the file is absent or unusable, still creates the session summary-only. This is the exact population that must be labelled rather than silently blended.

**A4. Deletion does not cover files or every row.**
`deleteAccount` omits `WebhookEvent`, and neither `deleteAccount` nor `resetAthleteData` removes uploaded private files referenced by `WorkoutAsset.file_url` and `WorkoutSession.raw_file_url`. Records go, bytes stay.

**A5. Provider sync health is still unverified end to end.** Garmin and COROS connect/sync/reconnect have not been proven with real accounts in this app. This is the single largest launch blocker and no amount of code review clears it.

**A6. Garmin access is a standing external risk.** The Garmin developer programme stopped accepting new sign-ups. The existing `GARMIN_CLIENT_ID`/`GARMIN_CLIENT_SECRET` must be confirmed working against a real account before Garmin is promised on the pricing page.

---

## 3. The separate load model (agreed design)

This is the one spec that has to be written down before code, because four writers and five readers depend on it.

**Per session (`WorkoutSession`)**
- Add `load_basis` enum: `verified_stream`, `summary_hr`, `summary_estimate`, `none`.
  - `verified_stream` requires a usable stream or laps (existing `isUsableTelemetry`) and HR-derived TRIMP from that session's own data.
  - `summary_hr` is TRIMP computed from a provider-reported average HR with no stream. This is legitimate physiology, but it is not verified workload.
  - `summary_estimate` is the rTSS fallback from Normalized Graded Pace.
  - `none` means no defensible load.
- Existing `session_trimp` / `session_tss` keep their meaning. `load_basis` records provenance, not a new formula.

**Per day (`DailyMetrics`)**
- `total_load_verified`, `total_load_summary`.
- `total_trimp` remains the sum of both, preserved for every existing chart and for `ctlRecalc` continuity.
- `verified_load_share` (0 to 1) so the UI can state confidence in one number.

**Aggregation rule (documented, testable)**
- CTL/ATL/TSB are computed on `total_trimp` so history does not fracture.
- Any surface that presents itself as physiological or stream-derived must state its verified share and must never imply a blended day is fully verified.
- Charts that describe *distribution* (pace, power, time-in-zone) remain gated on verified streams only, unchanged.

**Acceptance gate P2**
1. A COROS session with no file and one with a file, same athlete and date, land with different `load_basis`.
2. `total_load_verified + total_load_summary == total_trimp` for every row after a recompute.
3. `verified_load_share` renders on the fitness/fatigue surface, and a summary-only workout is badged in the workout list.
4. Zone panels still show "needs stream" for summary sessions.
5. Unit tests cover each `load_basis` path with fixtures.

---

## 4. Phases and gates

Indicative effort assumes one developer.

### P0: Baseline and fixtures (1 day)
Capture the current state before changing it, so every later gate has a reference.

- Record non-sensitive Garmin and COROS connection/sync baselines using an explicitly isolated test athlete and verified staging destination. Do not query or mutate production athlete rows for baseline capture.
- Run the existing suites (`src/science/__tests__/*`, `src/math/*.test.ts`, `npx vitest run`) and record the pass baseline.
- Add synthetic FIT, TCX and CSV fixtures to `src/science/goldencases/` covering: full stream, header-only file, corrupt header, laps without stream, summary payload with no file. Keep them in local tests until staging isolation is proven.

**Gate:** a documented baseline exists and fixtures load in tests. No production change yet.

### P1: Trust the inbox, connection and repeat sync (5 to 8 days) 🔴 launch blocker

The athlete journey is the product. Nothing else matters if connect and sync are unreliable.

- **Garmin real-account validation.** Connect, sync, disconnect, reconnect, expired access token refresh. Confirm which activity and recovery fields the account actually returns (Garmin Health API availability differs per account status).
- **COROS real-account validation.** Connect via MCP, historical sync, recovery sync, reconnect after `status: expired`, and the `CorosReconnect` email path.
- **Sync outcome honesty.** Every sync returns and displays counts: imported, duplicates skipped, summary-only, files unavailable, failures. No silent partial success.
- **Error surfacing.** `last_error` and `status: error` must be visible in `CorosIntegration` / `GarminIntegration`, with one-click reconnect. Today the fields exist; the visibility is unverified.
- **Deduplication hardening.** Same workout pushed by webhook and by polling must not double count. Extend the existing sport/duration/distance check to a stable provider activity id where one is available.
- **Time zone and date boundaries.** A morning session in UTC+10 must land on the correct local date (existing `+1 day` window extends are a mitigation, not a guarantee).

**Gate:** two real athletes (one Garmin, one COROS) complete three consecutive days of syncs with zero duplicates, zero silent failures, and correct local dates. Reconnect works without support.

**Dependencies:** existing secrets (`GARMIN_*`, `COROS_MCP_CLIENT_ID`); `COROS_WEBHOOK_SECRET` for the push path, otherwise polling only. **Risk:** if Garmin credentials are dead, Garmin ships as read-only marketing copy or is deferred, and COROS becomes the launch provider.

### P2: Separate load models and provenance (4 to 6 days)

Implements section 3. Touches the four load writers, `ctlRecalc`, `DailyMetrics` schema, and the dashboard surfaces.

- Schema: `WorkoutSession.load_basis`, `DailyMetrics.total_load_verified`, `total_load_summary`, `verified_load_share`.
- Writers: `ingestWorkoutFile`, `bulkIngestWorkouts`, `corosSync`, `garminSync`, `workoutWebhook`, `backfillTelemetry` set `load_basis` from the presence of a usable stream at ingest time.
- Aggregation: `calculateDailyTRIMP` and `ctlRecalc` split totals, keep `total_trimp` continuous, write the share.
- Migration: a one-pass recompute over existing sessions (reuse the `backfillTelemetry` cursor/batch pattern) rather than trusting historical rows.
- UI: verified-share badge on the fitness/fatigue and physiology surfaces, provenance badge on workout rows, unchanged "needs stream" treatment for zone panels.
- Docs: the aggregation rule into `PROJECT_HANDBOOK.md` so it survives the next refactor.

**Gate:** acceptance criteria 1 to 5 in section 3, verified by querying live rows for a mixed athlete.

### P3: The coaching loop that earns the subscription (7 to 10 days)

One loop, done well: readiness and context, today's recommendation, post-workout feedback, and an adjustment when the athlete deviates.

- **Daily recommendation** grounded in `AthleteStateSummary`, with an explicit "insufficient data" path instead of a neutral guess (the `readiness.ts` null-handling groundwork already exists).
- **Post-workout feedback** that references only metrics present in the session, and says so when a session is summary-only. `postWorkoutAIEvaluation` exists; its reliability (auth and param mismatches are a known defect) must be fixed and proven.
- **Plan versus actual** reconciliation that names a real deviation and proposes one bounded change, not a rewrite.
- **One correction path**: athlete can fix a wrong workout or profile value without support.

**Gate:** five athletes use the loop daily for two weeks; at least 60% act on a recommendation or adjustment; no feedback record cites a metric that is not in its session.

### P4: Paid access that can be trusted (4 to 6 days)

- Test-mode lifecycle first: checkout, `stripeWebhook` provisioning with confirmed payment status and matching amount and currency, cancellation, failed payment, billing portal.
- Confirm the webhook ignores `base44_test_checkout: "true"` sessions, and that `checkout.session.completed` without confirmed payment grants nothing.
- Entitlements read from `Subscription` server-side only. `FEATURE` gating already exists via `useSubscription` / `FeatureGate`; verify it cannot be bypassed client-side.
- Plan copy matches reality: do not sell Garmin if P1 showed it is not usable for new accounts.
- Run test-mode checkout, cancellation and refund paths in a verified isolated billing environment. Any real purchase, charge or refund on the published domain requires explicit user approval and an agreed amount; code review alone does not authorize a transaction.

**Gate:** a real customer can pay, receives exactly the advertised access, and can cancel; an inactive subscription loses access on the next request.

### P5: Privacy, deletion and support readiness (3 to 5 days)

- Two-account RLS probe: athlete A cannot read B's `WorkoutSession`, `DailyMetrics`, `LabResult`, `WorkoutFeedback`, or connections. Record the result, do not assume it.
- `deleteAccount`: add `WebhookEvent`, and purge private files referenced by `WorkoutAsset.file_url` and `WorkoutSession.raw_file_url`.
- `resetAthleteData`: same file purge, keep it aligned with `deleteAccount`.
- Confirm the support path and beta feedback modal reach a real inbox or queue, with error logging wired.

**Gate:** isolation probe passes with recorded evidence; a test account deletion leaves zero records and zero orphaned files.

### P6: Beta cohorts and exit criteria (ongoing)

| Cohort | Size | Exit criteria |
|---|---|---|
| C0 | 1 to 2 trusted | all P1 to P5 gates hold for 48 hours |
| C1 | 5 to 10, mixed devices | P3 loop used weekly by most; zero blocker defects; billing exercised |
| C2 | 20 to 50 | support response under 48 hours; provider sync success above 95% |
| Public | | C2 exit plus monitoring and analytics live |

Track: connect completion, first-sync success, repeat-sync success, duplicate rate, weekly active use, recommendation action rate, trial-to-paid, cancellation reasons.

---

## 5. Validation boundaries: local, isolated staging, published production

**Known endpoints:** production `https://trainpacelab.com`; separately identified staging `https://train-pace-lab-copy-8591c758.base44.app`. A distinct URL alone does **not** prove backend isolation or correct preview configuration. The source-of-truth app ID, backend base URL, credential scopes and environment-specific entity destination must be confirmed in the relevant Base44 dashboard before using staging for write tests. Do not copy production secrets or athlete data into staging.

| Layer | Method | Risk controller |
|---|---|---|
| Math | Local deterministic `vitest` fixtures and golden cases | No real athlete payloads or proprietary derivations in client artifacts |
| Ingestion | Local synthetic FIT/TCX/CSV; isolated staging write/read only after destination and ownership checks | Never send synthetic ingest requests to production or an unverified Preview fallback |
| Provider flows | Mock/token-free tests first; isolated test-provider accounts only after OAuth/webhook callback and entity destination are verified | No real athlete mutations; duplicate and idempotency checks must be recorded |
| Billing | Stripe test-mode lifecycle in verified isolated configuration | No live charge/refund/plan change without explicit approval |
| Privacy | Two isolated test identities; negative cross-account read/write checks | No production account deletion or reset as a test |
| Production smoke | Read-only sign-in/navigation/asset checks using explicitly authorised test identity | Capture published source SHA/checkpoint and date; no synthetic data creation |
| Runtime errors | Environment-specific logs with sensitive data redacted | Correlate with exact deployed revision; do not treat Vercel success as Base44 release proof |

**Staging release gate:** capture the staging app ID and backend URL from the staging dashboard, confirm Preview `VITE_APP_ID` and `VITE_APP_BASE_URL` resolve to staging rather than production fallback, validate authentication ownership, and record a harmless test-only write/read/delete cycle **only after** isolation is demonstrated. If any identifier is unknown, fail closed and continue local tests.

**Production release gate:** verify GitHub commit SHA against the actual Base44 published checkpoint and live assets, then perform non-destructive smoke checks. Source merge, green CI, or successful Vercel build alone is not proof of a live release.

Explicit non-assumption: a passing source review is never a runtime pass. Preview/browser failures are marked unverified, not silently passed or assumed broken.

---

## 6. What is deliberately deferred

- **Advanced FIT edge cases** (corrupt headers, sub-second GPS arrays, severe dropout reconstruction) beyond what `workoutParsers.ts` already handles. Do this only when beta shows real athletes hitting it.
- **Additional providers** (Oura, WHOOP, Polar, Withings, Fitbit, Suunto, Strava beyond current wiring). Existing `wearableOAuthSync` scaffolding stays; no new activation work.
- **Coach and team expansion**, advanced model comparisons, broader analytics, Airtable mirroring.
- **AI surface polish** beyond the P3 loop.

---

## 7. Traceability to the original seven PRs

| Original PR | Lands in | Note |
|---|---|---|
| PR 1 Staging isolation and webhook guards | P0 and P1 | Separate staging URL exists; prove backend isolation, preview configuration and test-athlete ownership before writes |
| PR 2 Math and test suite parity | P0 and P2 | Fixtures plus per-basis load tests |
| PR 3 Server authorization and RLS | P5 | Two-account probe is the gate, RLS is already largely in place |
| PR 4 Stripe billing isolation | P4 | Event-id idempotency already implemented; paid-state and amount matching are the gaps |
| PR 5 Advanced FIT ingestion engine | Deferred | Only with beta evidence |
| PR 6 Non-blocking AI coach UI | P3 | Scoped to one useful loop |
| PR 7 Privacy and cascade purge | P5 | Extends existing deletion to files and `WebhookEvent` |

The directive's stated blockers (preflight build bugs, staging safety, "Base44 treating data loosely") do not fully match this codebase. The genuine blockers are A1 (blended load), A4 (file deletion), A5 (unverified provider sync) and A6 (Garmin access).

---

## 8. Definition of MVP done

1. A new Garmin or COROS athlete connects, syncs and sees trustworthy data without contacting support.
2. Every session states whether it is verified or summary, and load provenance is visible and additive, never blended silently.
3. The daily loop produces a recommendation, a post-workout read and a deviation response that reference only observed data.
4. A real customer can pay, gets exactly what was advertised, and can cancel.
5. Deletion removes records and files, and two-account isolation is proven.
6. Beta cohorts C0 and C1 complete without blocker defects.

**Critical path:** P0 → P1 → P2 → P3 → P4 → P5 → C0. P2 can start in parallel with P1 only if P1's provider work is blocked externally; P4 waits on the plan copy decision from P1.