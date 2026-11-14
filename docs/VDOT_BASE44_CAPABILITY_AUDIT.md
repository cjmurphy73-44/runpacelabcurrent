# AUDIT-134 task 2.6: Base44 RaceResult capability verification

## Stack
Draft PRs #151 -> #153 -> #154 -> #155 -> this PR. No merge, schema deployment or production modification.

## Read-only Base44 evidence
- Staging app: TrainPaceLab-Staging `6aefe9d09e2788fc8591c758`, ready, version `df3623cac2ebfc94eacbed87ef455f04d5bf349b`.
- Production app: TrainPaceLab `6a504ebe6a5a6d1be058226c`, ready, version `3f386d4d52042940cb1767e6950ec78e33b3c81e`.
- Both app metadata report the same workspace organization ID. Different app IDs/versions **do not prove** distinct databases, auth identities, secrets, external provider connections or function deployments.
- Previous read-only schema inspection found no RaceResult schema in either app. The new entity and function are GitHub-only.
- Platform API catalog and documented `GET /api/apps/{app_id}`, entity-schema and backend-function operations were inspected. **No documented atomic composite unique constraint, transaction or compare-and-swap capability was established from those inspected APIs.** This is not proof the platform has no such capability; request explicit vendor/API documentation or isolated empirical proof.
- The Base44 Get app API is beta; its response may be truncated, and undocumented fields must not be relied upon. No test-data or auth isolation attestation was obtained.

## Corrections to prior assumptions
1. PR #155's admin-only RLS and service-role owner stamping are **unverified platform semantics**. A successful authenticated owner check in function code is not sufficient to prove a service-role-created record has durable creator metadata.
2. A pre-insert duplicate query is not atomic. Simultaneous identical requests can both insert. A revision read/compare/update is not an atomic CAS; simultaneous corrections can both pass.
3. A failed ownership readback after creation can leave an orphan record; do not rely on a post-create exception as rollback.
4. Direct entity write denial must be demonstrated with actual authenticated users. Schema configuration alone is not a verified security boundary.
5. As a safe source-only stopgap, `RACE_RESULT_MUTATIONS_ENABLED=false` and the submit function responds 503 **before any entity write**. This intentionally disables the new feature until backend atomicity and ownership guarantees are designed and verified. Do not toggle this flag as a substitute for atomic implementation.

## Tests
New Vitest tests check default-off, all six missing evidence capabilities, and strict boolean gating. Earlier tests cover race input and best-effort duplicate identity. No actual concurrent database tests have been run, and no full local checkout was available to execute the project test suite.

## Required staging acceptance before writes
1. Independently prove staging database, authentication, functions, secrets and provider integrations cannot affect production; identify exact app and backend environment.
2. Verify RLS against authenticated athlete A, athlete B and admin: direct create/update/delete, read ownership and foreign athlete ID.
3. Verify service-role creation stamps durable owner and athlete metadata, including failure/retry behavior; design cleanup/rollback for orphan creation.
4. Obtain a documented atomic uniqueness/idempotency primitive for (athlete, race identity), or use a supported transactional reservation design. Do not infer uniqueness from querying first.
5. Obtain an atomic compare-and-swap primitive for revision updates; verify stale concurrent corrections cannot overwrite each other.
6. Run controlled synthetic concurrency, duplicate, correction, authorization and recovery tests in isolated staging only, with cleanup.
7. Run full Vitest, lint, typecheck, build, exact-head CI and Base44 function-bundling checks.

## Release
**HOLD.** All race mutations intentionally disabled in this source branch. No merge, staging writes, deployment or production modification.
