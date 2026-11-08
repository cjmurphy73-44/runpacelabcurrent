# TPL-001 initial review, 2026-11-08

Overall assignment: **NOT VERIFIED**. No deployment, production action, merge,
new authorization/ingestion implementation or local scheduler installation.

## Completed

Engineering Lead inspected live PRs/checks/rules. Platform Engineer performed
fresh offline checks. QA Reviewer challenged setup and acceptance coverage.
Starter configuration and a task contract are being preserved for local use.

## Verified evidence

- GitHub #5: 5db1f34f16d693d624bf754bfa6e28e4c2a7d182, open, ready, unmerged.
- GitHub #4: 77e7116a7e3817552903ad043a69bd89924a3f52, open, draft, unmerged;
  stacked on fix/ci-restoration.
- Both exact-head CI runs passed Typecheck, Lint, Build, Backend, Tests and
  CI required when inspected by Engineering Lead:
  - https://github.com/cjmurphy73-44/runpacelabcurrent/actions/runs/42438784757
  - https://github.com/cjmurphy73-44/runpacelabcurrent/actions/runs/42442551300
- The type fix is already present in #5; no duplicate fix/repair branch needed.
- Platform local commit 6d816516621200d35c8636d7da20640ae1245d3e has the same
  exact tree as #5: e29b86501897ada9baae0097bb3f7e5f431de379. Diff empty,
  worktree clean. Fresh typecheck/backend validation/tests passed.
- Backend validator checked 48 function graphs and 27 resource configurations.
- Tests: 179 passing across 27 files. Test stderr included ECONNREFUSED against
  localhost:3000; passing status is not a warning-free claim.
- Brand/ProductFamily/ShoeGeneration lack explicit RLS; validator warns.
  This is deferred to the security gate, not silently accepted as secure.
- Main protection active; no bypass actors. Both PRs had no reviews/requested
  reviewers at inspection. Required independent approval is outstanding.

## QA outcomes

- Initial three role definitions, required TOML fields, 2-hour cadence, bounded
  tasks, existing-PR reuse, gate enforcement and no-production authority: PASS
  by content review and TOML parsing.
- QA found missing invitation/schema smoke scope. TPL-001 now explicitly covers
  anonymous 401/authenticated fail-closed 503 behavior for inviteAthlete and
  acceptInvite, absence of entity writes, archived unsupported schema and Data UI.
- TOML validation is not proof of installed local agent discovery or permissions.
- Follow-up QA reviewed the research role and MVP boundaries. Four agent TOMLs
  parse with the required fields. Wording now explicitly prevents a broken Data
  page from passing acceptance and distinguishes the initial three engineers
  from the on-demand analyst.
- This report is a source/content checkpoint, not a final-commit QA attestation.

## Blocked / not verified

- Current staging app identity/isolation, deployment of reviewed code and
  synthetic dashboard/workout runtime evidence.
- Staging invitation/Data page behavior and sandbox Stripe signed-event routing.
- Independent review, protected merges and post-merge verification.
- Local Codex custom-agent discovery/delegation and host-local exclusive locking.
- No local coding scheduler is installed by these files. The web oversight
  automation checks GitHub every two hours and cannot control the local Mac.

## Next

Use the authenticated local PR #4 worktree to verify the existing target app
read-only, then deploy only the reviewed code to that verified staging target
and execute the synthetic acceptance checklist. Keep #4 draft until complete.
The Product Owner also needs an eligible independent reviewer for #5.

Competitive research is a separate queued, on-demand assignment. Its agent
configuration exists; no competitor findings have been researched or claimed.
