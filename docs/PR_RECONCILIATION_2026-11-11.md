# TPL-001 — Open PR reconciliation and Odysseus merge barrier

**Reviewed:** 2026-11-11  
**Source:** GitHub PR metadata, patches and `main...head` compare stats for #4–#14, plus commit-associated GitHub Actions runs. **No branches merged or code deployed.**

## Critical safety finding: inherited Odysseus gitlink removal

The current `main` tracks `odysseus` as a Git gitlink (mode `160000`) to commit `ffea9184e3fdeda8ab1b0269b3e9f9f94a81cfdd`. The `main...fix/ci-restoration` comparison and **PR #5 patch** show that `odysseus` is **removed** in PR #5. PRs **#4, #6, #7, #8 and #9** also carry this removal relative to `main` because they descend from the same CI-restoration history, even when their own PR patch omits the inherited change.

**BLOCK MERGE:** #5 and every descendant carrying this removal until original-Mac preservation, independent Git history, dirty/untracked worktree contents, dependent launch paths and restore testing are verified and the owner explicitly approves the exact removal scope. The archived SHA in `_archive/unsupported-base44/orphan-gitlink.json` is **not** a complete backup. See the source-only inventory in `docs/ODYSSEUS_PRESERVATION.md` on `chore/codex-team-setup`; its own report says Mac preservation was not verified. Do not change or clean the user's local Odysseus directory.

## PR matrix (comparison to `main`, not just each PR's chosen base)

| PR | Target base / state | Change scope and dependency | Odysseus removed vs main? | CI at checked head | Gate / next action |
| --- | --- | --- | --- | --- | --- |
| #4 Staging guardrails | `fix/ci-restoration` / draft | CI-base descendant; staging verification, routing and workflow | **Yes** | Not checked in this pass | Block; preserve Odysseus; compare with newer #13 |
| #5 CI restoration | `main` / open, not draft | CI/typecheck/backend validation; includes gitlink deletion | **Yes** | **Success** (`42547567560`) | **Hard block** despite green CI; extract safe CI changes into a clean branch that preserves gitlink |
| #6 Engineering roles | `fix/ci-restoration` / draft | Broad agent docs and integration work; includes preservation inventory | **Yes** | Not checked | Block; review source docs independently |
| #7 Coach guidance | `fix/ci-restoration` / draft | Coach/recovery fixes, inherits CI branch | **Yes** | Not checked | Block; rebase/cherry-pick narrowly onto safe base |
| #8 Workout JSON export | `fix/coach-hold-review` / draft | 7-file export UX patch stacked on #7 | **Yes** | Not checked | Block; separate export-only changes from unsafe ancestry |
| #9 Garmin/COROS UX | `fix/workout-export-recovery` / draft | **81 files** relative to #8, **110** relative to main; includes COROS/backend and shared changes | **Yes** | **Success** (`42707612228`) | Block; split/reconcile large mixed scope; avoid duplicate COROS work with #10 |
| #10 COROS FIT/Today | `main` / draft | 25 files relative to main; COROS/FIT, Garmin and Today Session; 20-file overlap with #9 | **No** | **Success** (`42908905462`) | Candidate for isolated review after staging and conflict audit |
| #11 Dashboard (old) | `codex/tpl-cor-005-fit-outcomes` / **closed, unmerged** | Old stacked dashboard attempt | Not part of open queue | Not checked | Do not reopen automatically; superseded by #12 |
| #12 Dashboard | `main` / draft | 3 files; training-load snapshot; shares `athleteState.ts` with #10/#13 | **No** | **Success** (`42988185589`) | Review shared TypeScript fix and mobile staging acceptance |
| #13 Preview isolation | `main` / draft | 11 files; staging fail-closed, diagnostic, routing; shares `athleteState.ts` with #12 | **No** | **Success** (`43000094573`) | Keep draft pending independent browser, synthetic auth and data-isolation gates |
| #14 Production plan | `main` / draft | Planning docs only | **No** | **Failure** (`43000322426`) | Baseline TypeScript failure: `src/science/athleteState.ts:281 TS2367`; doc-only PR did not introduce this error |

**Important:** Green CI proves only the checks run for that commit; it does **not** authorize production promotion, staging data writes or an Odysseus removal.

## Confirmed overlap / conflict hotspots

1. **Unsafe inherited ancestry:** #5 → #4/#6/#7 → #8 → #9 all include the `odysseus` removal when compared with `main`. The PR's own patch can conceal the inherited change.
2. **COROS duplication:** #9 and #10 share **20 paths** relative to `main`, including `base44/functions/corosSync/entry.ts`, `base44/shared/corosMcp.ts`, `base44/functions/garminWebhook/entry.ts`, `WorkoutSession.jsonc`, FIT tests and COROS UI. Neither branch should be blindly merged over the other.
3. **Shared TypeScript baseline repair:** #10, #12 and #13 all touch `src/science/athleteState.ts`; #5 and its descendants also touch that file. This likely explains why their CI succeeds while a doc-only PR from `main` fails typecheck. Confirm patch equivalence before extracting a minimal fix; do not assume branches' implementations are identical.
4. **Preview security vs wearable UX:** #9 and #13 both touch `src/lib/app-params.js`; reconcile security invariants before incorporating any provider UX.
5. **Dashboard lineage:** #11 is closed/unmerged; #12 is its main-based replacement. Avoid applying both.

## Safe integration order (conditional, **not** approval to merge)

1. **Keep #5 and descendants #4/#6/#7/#8/#9 blocked.** Create a new isolated CI/typecheck fix branch from `main` that leaves the Odysseus gitlink intact, then validate independently. Do not cherry-pick gitlink removal.
2. Review and test #13's fail-closed Preview isolation on a clean staging browser and synthetic accounts; confirm backend function/secret isolation. Do **not** promote to production merely because CI passes.
3. Review #10's COROS/FIT changes independently, with actual provider staging evidence. Split #9's Garmin/COROS UX into narrow safe PRs based on reviewed code, rather than merging its broad inherited history.
4. Review #12's dashboard changes and mobile acceptance after resolving `athleteState.ts` overlap with the chosen base.
5. Review #7/#8 coach/export fixes as isolated patches only after disentangling unsafe ancestry; review #4/#6 documentation and CI guardrails separately.
6. Treat #14 as a planning record. Fix `main`'s baseline typecheck error in a **separate** atomic code task and rerun CI. Keep the plan draft until reviewed.

## TPL-001 acceptance record

- [x] Enumerated open PRs and checked #11 closed/unmerged.
- [x] Compared changed-file sets to `main`, not only stacked PR bases.
- [x] Located inherited Odysseus removal and recorded a **no-merge barrier**.
- [x] Recorded major file overlaps and a conditional safe integration sequence.
- [x] Inspected latest available CI runs for #5/#9/#10/#12/#13/#14; recorded #14 baseline failure.
- [x] No code merges, Base44 writes, production deployments, secret changes or Odysseus changes.

**Next eligible task:** TPL-002 (read-only staging function/external dependency inventory), or a separate atomic baseline typecheck repair. Do not mark G0 accepted yet: the PR ancestry and CI baseline still need remediation.
