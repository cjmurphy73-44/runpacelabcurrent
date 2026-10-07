# TrainPaceLab — Next-Phase Reliability Roadmap

_Concise, risk-first, ordered plan across the three open tracks: beta readiness, wearable (COROS) reconnection, and science reliability._
_Status legend: ✅ pass · ❌ fail · 🟡 unverified · ⛔ blocked. An item stays 🟡 until fresh runtime evidence is recorded._

This file is the **sequencing and acceptance layer** for the next phase. It draws on `src/BETA_READINESS_ROADMAP.md` (route-level checks) and `src/PRODUCTION_ROADMAP.md` / `ROADMAP.md` (build/fix detail), but it does not duplicate them. It defines the order to attack the remaining open work, the binary pass/fail criteria for each milestone, dependencies, and blockers. Source inspection alone is never a pass; preview/browser limitations are recorded as 🟡, not ✅.

**Sequencing principle (risk-first):** account/ownership/billing first → COROS recovery sync reliability → science confidence. Live money testing is gated behind test-mode success. Nonessential feature expansion is deferred until all 🔴 items in a milestone pass.

---

## Milestone M0 — Prerequisites & test accounts (blocks everything)

| # | Action | Type | Pass criteria | Status |
|---|---|---|---|---|
| M0.1 | Invite a second non-admin test account (distinct email) | manual | Invite accepted; account can sign in | 🟡 |
| M0.2 | Confirm `COROS_WEBHOOK_SECRET` is set (or note it as a blocker) | manual/secret | Secret present in env; value not exposed | ⛔ |
| M0.3 | Confirm preview sandbox is usable for E2E, or flag the blocker | manual | At least one preview_execute_code run succeeds | 🟡 |
| M0.4 | Resolve Builder-plan function-limit (403 on 5th function) — upgrade or consolidate | decision | A new function deploys without 403 | ⛔ |

**M0 gate:** M0.1 ✅ (needed for M2 isolation); M0.2 resolved or explicitly accepted as a blocker before M3. M0.3 and M0.4 may trail but unblock later milestones.

**Blockers to surface up front:** missing `COROS_WEBHOOK_SECRET`; preview-sandbox instability; Builder-plan backend-function ceiling; no second test account.

---

## Milestone M1 — Beta readiness: stability fixes (code)

Code changes that must land before any external tester is invited. Each has a route-grounded retest in `src/BETA_READINESS_ROADMAP.md` Phase 0/3.

| # | Action | Type | Pass criteria | Deps | Status |
|---|---|---|---|---|---|
| M1.1 | Fix `/plan` TrainingPlan 500 (reproduce → read `TrainingPlan.jsx` + failing call → fix request shape/null guard) | code | `/plan` loads for athletes with and without an existing plan, no 500 | M0.3 | 🔴 |
| M1.2 | Fix Tools dropdown → Physiology Lab nested trigger on mobile (≤473px) | code | Physiology Lab opens from the Tools menu at 390px | — | 🔴 |
| M1.3 | Move `base44ConnectorGateway` client-side callers behind backend-function proxies (connectors are server-side) | code | No adapter runtime errors in console across Home, Imports, Settings | — | 🔴 |
| M1.4 | Delete the orphaned E2E test conversation from CoachMessage data | code+manual | No test conversation renders for a real user in `/coach` | — | 🔴 |

**M1 gate:** all four items ✅ (retested on the published app, fresh evidence recorded). No cohort invite while any is ❌/🟡.

---

## Milestone M2 — Beta readiness: onboarding & ownership smoke test (manual)

First-user journey verification using the test accounts from M0.1.

| # | Action | Type | Pass criteria | Deps | Status |
|---|---|---|---|---|---|
| M2.1 | Registration → OTP → verifyOtp → redirect to `/app`; no `loginViaEmailPassword` shortcut | manual | Full multi-step completes; lands on Home | M0.1 | 🟡 |
| M2.2 | New account with no `AthleteProfile` lands on onboarding, not a crash; profile created on submit | manual | Exactly one `AthleteProfile` per user after onboarding | M0.1 | 🟡 |
| M2.3 | Two-account RLS isolation probe: User A cannot read User B's `WorkoutSession`/`DailyMetrics`/`LabResult` via SDK | manual | Cross-athlete filter returns empty, not 403-crash | M0.1 | 🟡 |
| M2.4 | Coach picker enumerates only the coach's roster, never the full directory | manual | Roster = `CoachAthleteAssignment` rows for this coach | M0.1 | 🟡 |

**M2 gate:** all four ✅. This is the single biggest privacy gate — do not invite a cohort with M2.3 unverified.

---

## Milestone M3 — Beta readiness: billing lifecycle (test mode → live)

Live money testing is gated behind test-mode success.

| # | Action | Type | Pass criteria | Deps | Status |
|---|---|---|---|---|---|
| M3.1 | Test-mode checkout round-trip: `stripeTestCheckout` → test card → redirect | manual | Test checkout completes; no live keys touched | M0.3 | 🟡 |
| M3.2 | Test-mode webhook: `checkout.session.completed` provisions a `Subscription` (plan, status, metadata `base44_app_id`) | manual | `Subscription` row created from test event | M3.1 | 🟡 |
| M3.3 | `useSubscription` unlocks Pro features in UI after provisioning | manual | Premium gate opens for the provisioned user | M3.2 | 🟡 |
| M3.4 | Cancellation event flips `Subscription` to `canceled`; entitlement revokes | manual | Status transition verified | M3.2 | 🟡 |
| M3.5 | **Gate:** only after M3.1–M3.4 ✅ — run a live checkout on the published domain | manual | Live `Subscription` provisioned with `base44_app_id` metadata | M3.1–M3.4 | 🟡 |
| M3.6 | Stripe webhook idempotency: replayed `event.id` is skipped (P1.6) | code+manual | Replay ignored, no double-provisioning | M3.2 | 🟡 |
| M3.7 | Archived A$19 Pro price + deactivated Team product cleaned up in Stripe dashboard | manual | Only the active A$9 price is live | — | 🟡 |

**M3 gate:** M3.1–M3.4 ✅ before M3.5 (live purchase). M3.5 ✅ before cohort invite. M3.6 🔴 must land before broad rollout.

---

## Milestone M4 — COROS reconnection & recovery sync reliability

Restore dependable COROS recovery sync and prove athlete ownership, safe token refresh, idempotent ingest, and provenance.

| # | Action | Type | Pass criteria | Deps | Status |
|---|---|---|---|---|---|
| M4.1 | Confirm COROS OAuth config (`COROS_MCP_CLIENT_ID` + `COROS_WEBHOOK_SECRET`) available | manual/secret | Both secrets present; webhook URL registered to `trainpacelab.base44.app/functions/<fn>` | M0.2 | ⛔ |
| M4.2 | Disconnect → reconnect a COROS account; connection state visible in UI | manual | `CorosConnection.status` cycles connected→disconnected→connected cleanly | M4.1 | 🟡 |
| M4.3 | Token refresh: let access token expire; confirm refresh works and `last_sync_at` updates | manual | Recovery sync succeeds post-expiry; no manual re-auth needed | M4.1 | 🟡 |
| M4.4 | Historical sync: trigger; confirm a real COROS workout appears in `WorkoutSession` owned by the correct athlete | manual | Workout attributed to the reconnecting athlete, not a default | M4.2 | 🟡 |
| M4.5 | Recovery sync: confirm `DailyMetrics` populates (HRV/sleep/resting HR) with `recovery_source: coros`; does not overwrite newer data | manual | Recovery fields land against the correct athlete; newer rows preserved | M4.4 | 🟡 |
| M4.6 | Webhook ingest: push a COROS event; confirm dedup via `WebhookEvent` on replay | code+manual | Repeat push skipped, `outcome: skipped_duplicate` | M4.1 | 🟡 |
| M4.7 | Error visibility: force a sync error; confirm `last_error` + `status: error` populate and surface in settings | code+manual | Failed sync shows a visible error state, not silent failure | M4.2 | 🟡 |

**M4 gate:** all 🔴 items ✅ (M4.1, M4.4, M4.5, M4.6). Recovery data must never overwrite newer or unrelated records.

---

## Milestone M5 — Science reliability: readiness & physiology audit

Evidence-based audit of readiness and physiology outputs. Preserve current behavior unless evidence supports a change; add regression cases for gaps found.

| # | Action | Type | Pass criteria | Deps | Status |
|---|---|---|---|---|---|
| M5.1 | Readiness missing-data: confirm server returns `null` score + `signal_count`/`has_baseline` when no recovery signals exist; UI shows "Insufficient Data" | code+verify | No synthetic neutral score; `ReadinessScoreCard` respects server null | — | 🟡 |
| M5.2 | Readiness sparse/inconsistent history: audit rolling-baseline behavior; confirm confidence degrades gracefully | code+verify | Baseline requirement enforced; low-confidence result labeled, not hidden | M5.1 | 🟡 |
| M5.3 | VDOT running-only filter: confirm non-running activities never inflate VDOT; provenance fields present (`vdot_source_sport`, `source_date`, `source_session_id`) | code+verify | VDOT computed from running sessions only; provenance exposed | — | 🟡 |
| M5.4 | Golden-case comparison: run `src/science/__tests__/goldenCases.test.ts` + `readiness.test.ts`; record any divergence | code | All golden cases pass; divergences logged with evidence strength | — | 🟡 |
| M5.5 | Evidence-strength rubric: tag each physiology/coaching feature High/Moderate/Emerging/Hypothesis; record data-source transparency | code/docs | Each science surface shows evidence strength + data source | M5.1–M5.3 | 🟡 |
| M5.6 | Add regression cases for any gaps found in M5.1–M5.4 | code | New tests committed; CI (when wired) stays green | M5.4 | 🟡 |

**M5 gate:** M5.1–M5.4 ✅ (behavior verified, not assumed). Do not change scientific assumptions without recorded evidence.

---

## Milestone M6 — Final beta-readiness pass/fail review

| # | Action | Type | Pass criteria | Deps | Status |
|---|---|---|---|---|---|
| M6.1 | Re-run `src/BETA_READINESS_ROADMAP.md` Phase 0–2 gate rows with fresh evidence | manual | All 🔴 items ✅ | M1–M3 | 🟡 |
| M6.2 | Re-run Phase 3 🔴 route rows (Home, /plan, /coach, /physiology, /import, /settings, /landing, protected redirect) | manual | All 🔴 route rows ✅ on mobile + desktop | M1 | 🟡 |
| M6.3 | Wearable-honesty sweep: no surface claims Garmin/Strava direct sync is live today | manual | Single source of truth = `src/lib/wearableCatalog.js` | M4 | 🟡 |
| M6.4 | Support path reachable (`/support` + beta feedback modal); error monitoring wired | manual | Tester can submit feedback in ≤2 taps; errors log to Airtable | — | 🟡 |
| M6.5 | Go/no-go decision for C0 cohort (1–2 trusted testers) | decision | All M1–M5 🔴 items ✅; no new ❌ after 48h | M1–M5 | 🟡 |

**M6 gate:** M6.1–M6.4 ✅ → advance to C0 cohort. Any 🔴 ❌ blocks the cohort until root cause is fixed and the item retests ✅.

---

## Rollout cohorts (from `BETA_READINESS_ROADMAP.md`)

| Cohort | Size | Exit criteria to advance |
|---|---|---|
| C0 | 1–2 (builder + 1 trusted) | All 🔴 still ✅ after 48h; no new ❌ |
| C1 | 5–10 (invite-only, mixed devices) | Zero 🔴 ❌; <3 🟡 open; billing exercised by ≥1 real or test purchase |
| C2 | 20–50 (wider opt-in) | Zero 🔴 ❌; <5 🟡 open; support requests answered <48h |
| C3 | public | All gates green; monitoring + analytics live |

---

## Retest rules

- A fix is not a pass: retest the same checklist item end-to-end after the edit, then record fresh evidence (route, date, tester, outcome).
- When a shared component changes (e.g. `workoutIngest`, RLS, readiness engine), retest every milestone row that depends on it.
- Preview/browser limitations are 🟡 until confirmed on the published app; never mark them ✅.
- Live money testing (M3.5) is gated behind test-mode success (M3.1–M3.4); never run a live charge before test-mode passes.
- Triage every ❌ by severity (🔴 blocks, 🟡 degrades) and user impact before fixing.

---

## Critical path

```
M0 (prerequisites + test accounts)
  └─► M1 (stability code fixes)
        └─► M2 (onboarding + ownership smoke test)
              └─► M3 (billing: test-mode → live)
                    └─► M4 (COROS reconnection + recovery sync)
                          └─► M5 (science reliability audit)
                                └─► M6 (beta pass/fail review → C0 cohort)
```

S5 health-data RLS + backfill (B1.2, already ✅) and observability (B3) run in parallel and may trail the critical path by one milestone. **M2.3 (two-account RLS isolation) and M3.5 (live purchase) must pass before any broad invite** — they are the single biggest privacy and billing gates.