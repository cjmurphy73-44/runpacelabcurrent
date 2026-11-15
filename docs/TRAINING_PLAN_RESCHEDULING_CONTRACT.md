# Training Plan Session Rescheduling: Proposed Persistence Contract

**Status: DESIGN AND READ-ONLY UI PREVIEW ONLY. No write route is implemented, approved, or connected.**

## Source audit (2026-11-15)

The canonical `TrainingPlanSession` entity includes `training_plan_id`, `athlete_id`, a calendar `date`, sport, prescribed targets/steps and outcome `status` (`pending`, `completed`, `partial`, `excess`, `skipped`, `modified`). Existing row-level access permits reads by an athlete, coached-athlete association or admin. Updates are limited to **created_by_id == authenticated user.id** or admin. Therefore reading a session does **not** establish update authority, particularly for coaches or generated plans. The schema has no dedicated `revision`, `rescheduled_from`, `rescheduled_by` or audit-log fields.

## Preview delivered in PR #216

The seven-day calendar offers **Preview reschedule** only for records whose loaded athlete identity and plan identity are present, and whose status is `pending`. The proposed date must be a real local `YYYY-MM-DD` date, different from the original, within the displayed future seven-day window, and not collide with another pending session of the same sport. It displays a clear **Not saved** message. No Base44 update/invoke/write call is possible from this preview. Client-side checks are usability gates, not authorization or transaction guarantees.

## Required server contract before live rescheduling

1. Authenticated server-owned function (never a direct client `TrainingPlanSession.update` write) resolves session by ID and loads the owning TrainingPlan. Verify actor identity, plan/session athlete identity, RLS-compatible creator/admin authority and explicitly permitted coach delegation. Do not infer ownership from a client-provided `athleteId`.
2. Accept a minimal request `{ session_id, target_date, expected_revision, idempotency_key }`. Ignore client-provided sport, status, training plan ID or workout targets. Reject missing identifiers, invalid dates, past/out-of-range changes, unchanged date, non-`pending` outcomes, active coach hold when applicable, or linked actual/completed session.
3. Atomically enforce an **expected revision** and a collision policy across all pending sessions (the read-only client preview currently uses same-athlete/same-sport/day as a conservative conflict warning). A compare-and-swap or transactional equivalent is required. The current entity has no revision field, so this is **blocked** pending backend/storage design.
4. Apply idempotency and record an append-only audit entry with actor ID, athlete, plan, session, old/new dates, revision, timestamp and request ID. Return confirmed persisted session and revision, or a structured conflict/permission failure without falsely claiming success.
5. After a confirmed mutation, re-fetch the authenticated athlete-scoped schedule and invalidate the relevant calendar, plan and Today query keys. Handle uncertain network responses as **unknown outcome**, never as confirmed failure/zero writes; show retry only after checking persisted state. Do not silently alter actual workout records, completed status, physiological load or coach-hold state.
6. Exercise synthetic tests covering cross-athlete reads, created-by mismatch, coached-athlete delegation, stale revisions, duplicate idempotency keys, concurrent collision, real calendar dates and post-write audit failure. Only then test against an independently isolated, authorized Base44 staging app and athlete; no production test writes.

## Release blockers

No server write contract, transactional revision, append-only audit or authenticated staging isolation is verified. Vercel preview/source provenance and actual 320/390/768px browser screenshots are also unverified. Release HOLD remains in force. The existing draft PRs #7/#74/#212/#215 remain intact.
