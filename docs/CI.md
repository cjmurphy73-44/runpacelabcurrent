# CI checks

Every PR, including stacked branches, runs five independent checks: `Typecheck`, `Lint`, `Build`,
`Backend`, and `Tests`. Matrix fail-fast is disabled. `CI required` fails if any
check fails, is cancelled or is skipped. No check needs production secrets or a
Base44 login. Require these names in the main ruleset before merging.

`npm run validate:backend` compiles every function's relative import graph in
memory and validates JSONC resource structure, declared permission shapes, required field
references and agent tool references. Platform SDK/runtime imports remain
external. This is an offline compile/schema check, not proof of Deno runtime
compatibility, permission correctness or provider integration health. Missing RLS
on the three shoe-catalog schemas is reported visibly for PR 3, not represented as
an authorisation pass. The built-in User row permissions are platform-managed;
its editable custom fields still need the PR 3 FLS repair. Those require
isolated staging. `Build` verifies compilation; it does not deploy or prove the
correct live Base44 app ID is configured.

The invitation functions previously contained Python/FastAPI stubs in `.ts`
files. They now return authenticated 503 responses without touching data. Their
consent flow belongs to PR 3. The unused decorator-based AthleteInvite schema is
preserved in `_archive/unsupported-base44/` rather than shipped as an unsupported
entity format. No working invitation flow is represented as completed.

An orphan `odysseus` gitlink had no `.gitmodules` URL and caused checkout itself
to fail during credential cleanup. Its exact commit pointer is retained in
`_archive/unsupported-base44/orphan-gitlink.json`; the broken gitlink is removed
from the app index. No Odysseus source was checked out or removed.

## TPL-G0-001: exact-head CI and invitation review (2026-11-09)

Reviewed PR #5 at `5db1f34f16d693d624bf754bfa6e28e4c2a7d182` against its patch and the branch source. The workflow defines five independent matrix jobs (`Typecheck`, `Lint`, `Build`, `Backend`, `Tests`) and an always-run `CI required` aggregation job. The existing [successful Actions run 42438784757](https://github.com/cjmurphy73-44/runpacelabcurrent/actions/runs/42438784757) is historical evidence for this head, **not** a newly executed test. The GitHub commit-status endpoint returned only a successful `Vercel` status; that endpoint does not enumerate the Actions check runs, so it cannot independently re-attest all six required checks. Fresh check-run verification remains necessary before a protected merge.

The reviewed `inviteAthlete` and `acceptInvite` entrypoints both delegate to `invitationUnavailable`. Its source checks the caller via `auth.me()`, returns 401 for unauthenticated callers and 503 for authenticated callers, with no explicit entity-write path. This is **source-only** fail-closed evidence, not a hosted authentication or no-write test. Verify both endpoints with distinct synthetic identities in isolated staging before accepting the change. The archived `AthleteInvite.ts` is a source move, not proof of hosted schema compatibility or preservation of records. Offline validation still cannot certify runtime permissions; the three catalog RLS warnings remain open.

**Gate decision:** `TPL-G0-001` review recorded, but staging/runtime acceptance, independent PR approval and Odysseus preservation are outstanding. PR #5 must remain unmerged. No production or staging deployment was performed for this review.

## TPL-G0-001 follow-up: exact-head Actions check attestation (2026-11-09)

GitHub Actions [run 42527948455](https://github.com/cjmurphy73-44/runpacelabcurrent/actions/runs/42527948455) is completed successfully on PR #5 head `5750f63b2115b2ceb968b8ca7b88f1a49828311e`. Its job-level readback confirms **all six** named jobs completed with `success`: Typecheck, Lint, Build, Backend, Tests and CI required. This resolves the earlier check-run visibility limitation for this exact head; it does not execute a new local test or attest to hosted invitation behavior.

GitHub returned **zero submitted PR #5 reviews** at this check. Independent approval, invitation staging acceptance, the archived schema's runtime compatibility, and verified independent Odysseus preservation remain mandatory before any protected merge. No production or staging write was made during this read-only attestation.
