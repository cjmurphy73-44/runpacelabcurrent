# Audit #134 task 2.4: VDOT race-result entry acceptance

## Stack and scope
- Draft PR #151: fail-closed VDOT inputs and removal of placeholder 55.
- Draft PR #153: athlete-attested RaceResult schema, authenticated submission and VDOT provenance, stacked on #151.
- This draft stacks on #153. **Do not merge any of these into main without full staging acceptance.**

## Implemented in this draft
- Mobile-first `RaceResultReview` on the existing VDOT page: date, distance, elapsed seconds, optional event name, self-reported provenance, saved result review and owner correction.
- Base44 function invocation uses POST with `action: 'correct'` because the SDK's functions.invoke is POST-oriented. Corrections check creator, athlete and provenance before updating.
- Best-effort duplicate check queries the exact race date, distance and elapsed time under authenticated entity permissions; responds with 409 and an existing ID for a duplicate. Four extra unit tests cover identity, correction exclusion and malformed records.
- No user-facing claim of independent verification, no automatic overwrite of athlete VDOT profile, no fabricated Norwegian workout telemetry.

## Read-only staging inspection, 2026-11-14
- Base44 lists **TrainPaceLab-Staging** app ID `6aefe9d09e2788fc8591c758` and **TrainPaceLab** app ID `6a504ebe6a5a6d1be058226c`, distinct apps.
- Staging has only main branch; no independent feature branch returned.
- Staging schema read: `WorkoutSession` exists, `RaceResult` not present. Production schema read: `RaceResult` not present.
- **Separate IDs do not prove independent database, authentication or secrets**, and GitHub PR files are not deployed to Base44 staging. No schema change, test records, authentication test or deployment was performed.

## Blocking defects / required validation
1. **Direct entity create ownership**: RaceResult schema create RLS currently only binds `created_by_id` to user, not the athlete_id. Verify server-side field-level ownership or deny direct client writes and force all writes through the function. A user could otherwise create an own record with an arbitrary athlete_id. The read and compute paths filter creator and athlete, but that is not sufficient to approve writes.
2. **Non-atomic duplicate check**: concurrent submissions can both pass; Base44 unique index or transaction/idempotency support is unverified. This is best-effort only. Correction has no compare-and-swap revision; concurrent edits can overwrite each other.
3. **SDK error and RLS semantics**: verify `base44.functions.invoke` response/error format, `created_by_id` filtering, entity `get` permissions and RLS enforcement on synthetic staging data. The client review filter is not a security boundary.
4. **No full pagination**: saved-result review caps at 100 and physiology computation at 200; completeness not proven. Do not treat truncated history as complete.
5. **Date input/VDOT domain**: test dates around time zones and extreme race durations; no fake verified race provenance. UI needs usability testing on 390px phone and screen reader.
6. **Missing-VDOT consumers**: Norwegian planner now shows explicit missing state; audit remaining plan generation, coach briefing, readiness and race prediction before release.
7. **Staging isolation**: confirm database, auth, functions and secrets independently. No synthetic writes until proven.
8. **Tests and build**: run targeted Vitest and full suite, lint, typecheck and build on this exact branch. No tests were executed by this connector session; GitHub CI must be independently checked.

## Release
**HOLD**: draft GitHub only, no merge, staging schema write or production deployment. The current changes are reviewable implementation, not verified end-to-end acceptance.
