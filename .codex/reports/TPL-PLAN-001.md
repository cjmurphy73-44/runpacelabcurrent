# TPL-PLAN-001: persistent MVP backlog and protected-project inventory

9 November 2026. One documentation/reconciliation task; maximum run 45 minutes.
Owning existing PR: #6, `chore/codex-team-setup`, parent
`93fc8325309b8f0445923aff04eb0e7aa7bc2e2a`.

## Delivered scope

- Canonical `docs/MVP_ATOMIC_BACKLOG.md` with stable IDs, owner groups, gated
  dependencies, explicit acceptance and implemented-vs-accepted state across
  frontend/backend/UI/UX/providers/security/billing/tests/staging and assets.
- Roadmap and AGENTS link the index and persist the Odysseus preservation rule.
- `docs/ODYSSEUS_PRESERVATION.md` inventories app tracking and dependency consumers
  and defines private restore verification before any inherited removal merge.
- Source reconciliation records published infra head 76b37bc; the earlier
  publication blocker is cleared. Infrastructure and #4 have a common base and
  disjoint file changes since it; no combined acceptance is claimed.

## Evidence and limits

Read main AGENTS/README, approved roadmap/MVP criteria on #6 and delivery
contract/checkpoint/UX queue from #9. Main lacks roadmap/delivery contract files;
documented branch fallbacks were used. Fresh connected GitHub PR search returned
#4-#9 open and unmerged with no submitted reviews. Exact-head runs were successful
for #4 ea36c7c, #5 5db1f34, #6 93fc832 and #9 b5a5d923. The infra-head endpoint
returned no PR-triggered runs; this is not a claim that all CI is absent.

Read-only Git inventory confirms main's mode-160000 Odysseus pointer and absent
.gitmodules; removal already exists in #5 and descendant branches. An empty
cloud directory and missing independent commit object cannot establish original
Mac preservation. Source search found launch helpers and direct-main/reset paths;
none was run. No independent project files, Git tracking or history were changed.

The current user instruction prohibits production deployment/data changes and
overrides historical release permission in the delivery document. G0 is still
open. This run changes documentation/instructions only; it does not implement a
later gate, integrate stacks, install a scheduler or verify private staging.

## Local validation executed

- 73 unique task IDs; explicit task dependencies resolve, local Markdown links
  resolve and all four existing role TOMLs parse. Diff inspected; whitespace
  check passes. Only the five intended documentation/instruction files changed.
- `npm run typecheck`, `npm run lint`, `npm run build` and
  `npm run validate:backend` pass; 48 backend entry graphs and 27 resources.
- `npm run test:ci`: 179 tests across 27 files pass using the workspace's existing
  installed dependencies. Exact-head GitHub CI performs its own clean install.
- Existing three catalog RLS warnings, localhost SDK test stderr, npm config
  warnings and large build-chunk warning remain. No warnings were suppressed.
- Published-tree equality and exact-head CI must be checked after publication
  and reported with that commit. These local results are not hosted staging or
  independent review acceptance.

## Next atomic action

TPL-REC-001: review/test the existing eight-handler external-sync guard contract
offline, on the published infrastructure source. TPL-ODY-002 requires original
Mac preservation/restore evidence before any removal-bearing merge.
