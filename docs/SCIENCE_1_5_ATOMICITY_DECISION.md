# Science 1.5: atomicity and pagination decision

## Evidence and decision

Base44 entity SDK exposes create, update, filter and offset-based pagination, but we have **not verified** an atomic conditional write, cross-entity transaction, or enforced uniqueness constraint that covers both WorkoutSession and DailyMetrics. A check-then-create rest declaration is therefore not safe against simultaneous Garmin/COROS/Strava/file/manual workout ingestion. A second read after writing does not close the race. Public SDK examples show filter(query, sort, limit, skip), but do not demonstrate a transactionally consistent snapshot.

**Decision:** The review endpoint returns HTTP 409 `ATOMIC_REST_CONFIRMATION_UNAVAILABLE` for all rest-confirmation requests, before any entity read or mutation. The Physiology Lab remains read-only. Existing historical declarations remain distinguishable from recorded workouts; no records are deleted or rewritten. Production is untouched.

## Diagnostic pagination

Read-only preview uses bounded offset pagination with `created_date` ordering, a 100-row page size and 1000-row per-day maximum. It rejects malformed responses, missing row identities, duplicates, ambiguous equal-timestamp ordering, and excess rows. This is **diagnostic**, not a transactionally consistent snapshot. Concurrent inserts/deletes can still shift offsets and escape detection. Never use these reads to authorize a mutation or claim a complete provider recording history.

## Verified staging state (2026-11-14)

The connected Base44 app inventory distinguishes production TrainPaceLab (app ID `6a504ebe6a5a6d1be058226c`) from TrainPaceLab-Staging (app ID `6aefe9d09e2788fc8591c758`). The staging DailyMetrics schema currently lacks `confirmed_rest`, `confirmed_rest_source`, and `confirmed_rest_at`; it still describes `total_trimp` as TRIMP-or-rTSS fallback. Therefore PRs #142/#145/#146 are **not deployed or staging-accepted**, despite GitHub CI passing. Do not run write-path acceptance tests against production. Deploy and inspect the isolated staging schema and backend functions only after approved release gating.

## Required backend capability for enabling rest confirmation

1. A transaction or equivalent atomic conditional write covering the athlete/date rest marker and workout-ingestion state, or a verified serialized per-athlete/day command processor that **all** write paths must use, including webhooks and file/manual entry.
2. Enforced idempotency/uniqueness for each activity and rest decision, plus an audit log and a revalidation/reconciliation path.
3. Athlete-local date normalization and consistent provider ingestion date semantics.
4. Staging proof with deterministic concurrent import-vs-confirmation interleavings, multiple providers, partial sync and retry, and pagination boundaries.
5. Integration of #142 and #145 after review; CI alone does not establish live Base44 semantics.

## Explicit non-goals

Do not infer rest from no activity, successful sync, OAuth connection, or empty search results. Do not auto-approve a training plan or update CTL/ATL from an unverified day. Do not label the present implementation race-safe for writes.
