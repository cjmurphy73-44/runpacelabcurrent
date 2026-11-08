# CI checks

Every PR to main runs five independent checks: `Typecheck`, `Lint`, `Build`,
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
