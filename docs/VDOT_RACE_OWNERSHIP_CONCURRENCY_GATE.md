# AUDIT-134 VDOT task 2.5: ownership and concurrency gate

## Branch reconciliation
- PR #151: base VDOT input/evidence and placeholder safeguards.
- PR #153: RaceResult self-report schema, ingestion and physiology consumption, stacked on #151.
- PR #154: mobile entry/review, correction and best-effort duplicate check, stacked on #153.
- This draft stacks on #154. No merge or deployment of any of these PRs.

## Hardening implemented for review
1. RaceResult RLS denies ordinary client create/update/delete through an admin-only condition; creator-scoped reads remain. The authenticated function now performs service-role writes **only after** confirming user, linked AthleteProfile ID and creator ownership. It sets athlete_id and created_by_id on create and checks returned ownership. **Base44 RLS syntax and service-role persistence require staging verification.**
2. Correction uses authenticated POST action with a mandatory `expected_revision`. It checks creator, athlete ID, self-report provenance and stored revision, returning 409 for stale state. Revision increments on update.
3. Exact race duplicate query is scoped by athlete and creator. Duplicate identity covers date, distance, elapsed time and running sport, with 409 on match.
4. Client edit form submits the revision from its loaded record. A missing revision fails closed until a migration or explicit compatibility policy exists.
5. Added five synthetic deterministic tests for duplicate identity and correction exclusion. These are **not concurrency tests**.

## Unresolved critical blockers
- **No atomic uniqueness**: Base44 entity schema/API inspection did not establish unique compound indexes, transactional compare-and-swap or idempotency reservation. Two concurrent creates can pass the same duplicate check. Do not claim duplicate safety.
- **No atomic correction**: read/compare/update can lose a race. `revision` is an advisory stale-edit check, not an atomic CAS.
- **Service-role create ownership metadata**: must verify Base44 accepts and persists explicit `created_by_id` under service role. If not, the function throws after creating a potentially orphaned record; a transactional creation alternative is required. Do not run authenticated synthetic writes before isolation and rollback are verified.
- **Schema RLS compatibility**: admin-only mutation policy must be tested against both direct user SDK calls and service-role function calls, including an attacker-supplied foreign athlete ID.
- **Staging isolation**: distinct app IDs are confirmed, but database, auth, backend functions, secrets and external integrations are not independently attested. Staging has no RaceResult schema. No synthetic writes or schema installs attempted.
- **Race result completeness**: unpaginated/limited reads in physiology and UI; revision migration and correction audit trail not yet implemented.
- **Tests**: no complete checkout of the GitHub branch is available in this connector session, so Vitest, typecheck, lint and build have not been executed. GitHub Actions and Vercel statuses must be checked at the exact head SHA.

## Release decision
**HOLD**. No production or staging changes. Resolve atomicity and ownership persistence, prove isolation, then run synthetic acceptance and full tests before requesting merge approval.
