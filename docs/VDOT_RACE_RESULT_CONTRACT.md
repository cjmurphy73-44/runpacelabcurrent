# AUDIT-134 task 2.3: race result provenance and staged acceptance

## Design
- `RaceResult` is a separate, athlete-owned record; no existing WorkoutSession is retroactively classified as a race.
- Current supported ingestion source: **athlete_attested**, evidence status **self_reported**. There is no provider-verified ingestion path. Schema intentionally excludes `verified` until independent verification exists.
- `submitRaceResult` requires authenticated POST, a creator-owned AthleteProfile and server-side ownership assignment; it ignores client-supplied athlete id and provenance.
- Validated input: running sport, real nonfuture YYYY-MM-DD date, finite race duration >=180 seconds, distance >=1200 metres, bounded optional descriptions and positive finite Daniels VDOT.
- `physiologyCompute` reads creator-scoped `RaceResult` rows and uses the strongest recent (<=180 days) valid athlete-attested race, with source and evidence status included in response. Stored legacy VDOT remains labeled `unverified_legacy`, not provider-verified.
- Null-VDOT review: `NorwegianIntervalPlanner` had a default 55 and dereferenced null prescription/decoupling/telemetry. Replaced with explicit missing state and a real model-derived pace when VDOT supplied. `getVdotPaceZones` fixed paces were removed in #151. Other plan, dashboard and coach consumers still require systematic staged review.

## Security and scientific limitations
- The RaceResult entity RLS is creator-scoped. The backend uses both `athlete_id` and `created_by_id` filters to reject records written by other creators. **Verify Base44 supports filtering on the system `created_by_id` field in this runtime.** If not, fail closed; do not broaden the query without an alternative ownership check.
- There is no atomic uniqueness/idempotency reservation for repeated athlete submissions; duplicate manual results may exist. They are read-only for calculation but need deduplication and correction workflow before launch.
- No independently verified race result or athlete performance evidence is claimed. Self-attestation can be wrong; source labels must remain visible in UI.
- Stored VDOT may be stale or have unknown origin. Do not overwrite the profile automatically from self-attested submissions.
- RaceResult reads are limited to 200 rows and not proven complete; this is not a comprehensive historical record.
- The `WorkoutSession` race-marker eligibility introduced in #151 remains a pure helper but is **not used** to compute athlete VDOT in this branch, because the schema lacks a verified race flag.
- No frontend race-result submission form has been wired to the endpoint yet. It is a backend ingestion contract, not a released end-to-end user flow.

## Acceptance gate
1. Run Vitest tests for `raceResultContract.test.ts` and `vdotEvidence.test.ts`, then full test, typecheck, lint, build.
2. Confirm Base44 staging app identity `6aefe9d09e2788fc8591c758` is isolated from production app `6a504ebe6a5a6d1be058226c`, including data and secrets, before creating **synthetic** test records.
3. Validate Base44 schema/function bundling, creator-id query semantics, unauthorized/foreign athlete submission, duplicate writes, invalid values, missing-result UI and recovery.
4. Review remaining VDOT consumers and test mobile layout, accessibility and plan-generation null behavior.
5. Only after isolated staging acceptance, provenance UX and explicit approval, consider a migration and production release.

## Environment evidence, 2026-11-14
Read-only Base44 status checks: staging **ready**, version `df3623cac2ebfc94eacbed87ef455f04d5bf349b`; production **ready**, version `3f386d4d52042940cb1767e6950ec78e33b3c81e`. Different app IDs and versions are **not sufficient proof of isolated data/secrets or branch deployment**. Staging WorkoutSession schema has no confirmed race marker. No staging write or deploy performed.

**Decision: HOLD.** Draft source changes only. No merge or production mutation.
