# TPL-REC-001: offline external-sync handler contract

9 November 2026. Source parent `76b37bca2f8afca27f0d0e073bbc31f41f83436d`,
existing branch `fix/tpl-infra-001`. One task: review/test the existing guard,
without integrating branches or modifying runtime code.

## Executed coverage

The new `scripts/__tests__/external-sync-handlers.test.mjs` bundles the actual
entry files and their real relative import graphs with esbuild. Each bundle
runs in a separate VM context. SDK creation, FIT dependency and platform
waitUntil are explicit fixtures. Every outbound fetch and modeled SDK mutation,
function invocation, email/AI call and deferred-work request is trapped. No real
credentials, app IDs or provider connections are used.

| Executed case | Outcome |
| --- | --- |
| Eight endpoints: corosSync, garminSync, stravaSync, wearableOAuthSync, airtableSync, garminWebhook, workoutWebhook, webhookWearableSync | Each returns the guard's 503 JSON with zero entity reads, modeled writes or network calls for staging, missing configuration and denied env access: 24 cases. |
| Four action routers | All 16 enumerated side-effect actions return the guard's 503 before SDK reads/writes or provider fetch. COROS includes webhook, list_tools, sync_all and recovery. |
| Four OAuth callback routers | Synthetic code/state callbacks return 503 before token exchange. |
| Four status routers | Authenticated synthetic disconnected status returns 200 with fixture reads only; no provider call or modeled mutation. Signed-out null-user fixture returns 401 without entity access. |
| COROS signed webhook disguised as status | Signature routing still reaches the 503 guard, not the read-only status handler. |
| Four unconditional receivers with malformed JSON | 503 before SDK client construction or payload handling. |
| Guard response helper | Missing Deno and denied access to either guard variable return 503; only exact production + true returns null. |

57 new handler cases plus four new helper cases. Targeted suite: 64 passing tests
including the three existing predicate tests. Reviewed handler source matches
the intended status exception and guarded side-effect paths; no runtime patch
was needed for this bounded contract.

## Full local validation

- `npm run test:ci`: 247 tests, 31 files pass.
- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
- `npm run validate:backend`: 48 entry graphs, 27 resource configurations pass.
- `git diff --check`: pass. Only two test files and this report change.
- Existing catalog RLS warnings (three), localhost test stderr, npm config and
  bundle-size warnings remain. Existing installed dependencies were used locally;
  a future exact-head CI clean install is separate evidence.

The Base44 instructions requested by AGENTS were installed/read in a separate
scratch inspection directory. No application dependency or skills-lock changed.

## Limits and reconciliation

This is executed offline fixture evidence, not a deployed Base44 runtime, real
SDK authentication/error contract, ownership/RLS audit, provider sync, data
fidelity or production-enabled integration pass. Only the eight named guarded
endpoints and listed paths are covered, not every app function/background job.
The FIT parser is deliberately not executed by this suite.

The workflow runs on main/master/dev pushes or pull requests, not arbitrary
feature-branch pushes. No matching infrastructure PR was found. Publish this
test-only delta on its existing branch; do not claim GitHub CI passed if no
exact-head run exists. PR #4 has advanced to 832e038 with preservation docs only;
its preflight alias fix remains absent from the infrastructure branch. No stack
merge, retarget or new overlapping infrastructure PR is performed in this task.

Odysseus files, tracking and history were not changed. Independent Mac
preservation remains a prerequisite to integrating/removal-bearing merges.
G0 stays open; no later implementation gate is unlocked.

## Next

TPL-REC-002 remains blocked on TPL-ODY-002 preservation evidence. The next
independent ready item is TPL-ASSET-001: inventory the existing logo/icon/imagery
family, provenance and actual placements without deleting or redesigning assets.
