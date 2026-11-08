# Odysseus tracking, dependencies and preservation gate

Inventory: 9 November 2026. Source-only review; Mac preservation **NOT VERIFIED**.
Owner direction: Odysseus is an independent protected project. Do not delete,
move, reset, clean, commit unrelated changes or merge its removal before verified
preservation. This report does not authorize relocation or removal.

## Git evidence

| Observation | Evidence / limit |
| --- | --- |
| App main tracks a Git link, not the independent source tree | `3f386d4d52042940cb1767e6950ec78e33b3c81e:odysseus` has mode `160000`, pointing to `ffea9184e3fdeda8ab1b0269b3e9f9f94a81cfdd`. |
| No submodule URL is recorded on this main snapshot | `git ls-tree` has no `.gitmodules` entry. Do not guess the independent remote URL. |
| Removal predates this run | CI commit `664f7a2` removes the gitlink; #4/#6/#7/#8/#9 and `fix/tpl-infra-001` inherit its absence. The older local CI commit `04ec555` also contains removal. No removal was authored or merged in this run. |
| Pointer archive exists | `_archive/unsupported-base44/orphan-gitlink.json` retains the exact SHA. This retains a reference, not files, uncommitted changes or a restorable independent repository. |
| Cloud files cannot establish Mac preservation | The inspected cloud `trainpacelab/odysseus` directory is empty, without its own `.git`. The target commit is absent from this app clone's object database. The owner's modified Mac copy is a different filesystem. |
| Owner reports modified independent content | Preserve it in place. A clean cloud checkout is not proof the Mac copy is clean, backed up or recoverable. |

The tracking removal is included even in PR #6's inherited base. Its new
documentation may be reviewed, but merging that branch can still carry the
removal through #5. All such merges remain blocked by preservation evidence.

## Dependency inventory at main 3f386d4

| Surface | Observed dependency / risk |
| --- | --- |
| `src/`, `base44/`, package manifests and CI | A case-insensitive tracked-source search found no Odysseus reference in these paths. This is source-scope evidence, not a full machine dependency audit. |
| `vitest.config.ts` | Explicitly excludes `**/odysseus/tests/**`; app tests do not validate the independent project. |
| `restart-dev.sh`, `reload-dev.sh` | Launch `~/odysseus/start-macos.sh`. Reload also kills broad process names and closes Terminal windows. Preserve the referenced path; neither script was executed. |
| `odysseus_bridge.py` | Depends on Python `gradio`, `subprocess`, a hard-coded Mac app checkout path and Git. Its write path pushes `main` directly. Do not run it as the approved delivery runner. |
| `odysseus-api-trigger.sh` | Calls a local agent API at localhost:8000. Local service availability/authentication is unverified. |
| `odysseus-autonomous-loop.sh`, `odysseus-agent-loop.sh` | Use Aider/Ollama and app `ROADMAP.md`; broad staging/direct-main push and working-tree revert paths conflict with current preservation and PR controls. Do not execute them. |
| Other tracked launch/loop helpers | `odysseus-loop.sh`, `odysseus-market-loop.sh`, `BASE44_GUIDE.md` also reference Odysseus. Exact installed schedules, shells, launch agents and editor tasks on the Mac have not been inspected. |

No new runtime dependency, process control or scheduler was installed or changed.
Source search cannot establish that local aliases, Docker bind mounts or launch
agents do not depend on the nested directory.

## Required private evidence before any removal merge

1. In the original Mac environment, identify both the nested project's real path
   and `~/odysseus`, resolving symlinks without moving either. Establish whether
   they are the same project or separate copies. Record independent Git root,
   HEAD, local branches, tags, remotes and uncommitted/untracked inventory privately.
2. Preserve independent Git history, refs and worktree content, including modified,
   untracked and needed ignored files. Secure files stay in private storage; never
   put secrets or a raw local inventory in this public repository. A Git bundle
   alone does not include dirty/untracked files. A filesystem copy without Git
   metadata alone does not prove independent history preservation.
3. Verify the preserved copy by restoring into a separate private verification
   location: check history/refs and content hashes, including modified files.
   Keep the original untouched; record only a sanitized verification result here.
4. Inventory launch scripts, shell aliases, editor tasks, scheduled runners,
   Docker mounts and other consumers of the current paths. Verify the existing
   original launch path still works without starting app-writing automation.
5. Obtain independent review of whether app Git tracking should be retained or
   deliberately unlinked. Any actual move/delete needs separate explicit scope
   and verified references. Until then, do not merge #5 or a descendant that
   carries removal. Do not force-add a guessed submodule URL to silence CI.

Removing an app gitlink is not the same operation as deleting the independent
directory, but a checkout/merge or cleanup may still affect local state. No claim
about continued Mac accessibility is justified until the above evidence exists.

## Next atomic actions

`TPL-ODY-002`: obtain the private original-Mac preservation/restore evidence.
In parallel, source-only `TPL-REC-001` can test/review the published infrastructure
guard contract without integrating branches, changing Odysseus or contacting
providers. See the canonical backlog for dependencies and acceptance.
