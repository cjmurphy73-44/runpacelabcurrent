# Autonomous MVP delivery contract

The Product Owner authorized recurring roadmap work and main updates for fixes
that have been tested and shown to work on 8 November 2026. This supersedes the
older blanket prohibition on merging in the recurring-run prompt. Repository
protections, required reviews and application-release controls remain in force.

Use one primary cloud workspace. Use the existing checkout: cloud tasks are
already isolated. Do not create a worktree unless the user requests one. Do not
open a parallel repair branch when an existing PR owns the work. Preserve other
writers' files; acquire an exclusive local writer lock before edits.

## One bounded work item per run

1. Read AGENTS.md, docs/DELIVERY_STATUS.md, the latest approved
   docs/DEVELOPMENT_ROADMAP.md and the task record. Until merged, read the roadmap from chore/codex-team-setup. Recheck
   actual GitHub heads and gate state; do not assume old report statuses are live.
2. Select one approved, eligible item. Finish the existing staging/CI gate before
   later authorization, billing, telemetry or science implementation. The current
   UI audit does not independently unlock those gates.
3. Reproduce the issue, implement the smallest coherent change, inspect the diff,
   run meaningful regression tests and all required checks, and verify affected
   behavior in the authorized staging environment. Label fixture/manual/remote
   evidence separately. Do not weaken checks to get a pass.
4. Commit and push to the existing feature branch. Update its matching PR rather
   than opening duplicates. Keep docs/APP_AUDIT.md and one task record current.
5. A completed ordinary fix may reach main through the protected PR process once
   exact-head CI, required review and affected-behavior acceptance are satisfied.
   Do not force-push main, bypass protection or self-approve. Security, billing,
   data migration/deletion and scientific changes require their stronger reviews.
   Do not merge an entire stacked PR chain merely because one child fix passed.
6. Repository merge permission does not authorize a separate Base44/Vercel
   deployment, production record write, environment publication or credential
   change. Check automatic Git-sync/release behavior before a main update so
   unreviewed backend/workflow changes are not released accidentally.
   The Product Owner subsequently authorized audit fixes to be synchronized to
   the existing Base44 staging app and the repository. Reviewed frontend-only
   staging builds and editor-source saves are permitted after target verification
   and backup; preserve backend guards, privacy and inactive workflows. This
   does not authorize unreviewed backend replacement. The Product Owner later
   explicitly authorized releasing this UI batch to https://trainpacelab.com/.
   That authorization supersedes the earlier staging-only deployment boundary
   for this batch; required independent review and acceptance still apply.
7. End with commit/PR/check evidence, completed behavior, blockers and the single
   next action. Stop after 45 minutes, one coherent item, an external blocker or
   another writer's lock. Do not retry unchanged auth failures indefinitely.

Keep secrets, session state, private app IDs/origins and athlete data outside Git.
Use existing TrainPaceLab-Staging only; verify its private target record before
remote writes, keep external workflows inactive and use synthetic accounts/data.
Do not require Stripe for a dashboard test. Never use production credentials.

## Scheduler activation status

This contract does not itself start unattended execution. No recurring-task tool
is exposed in the onboarding chat. Choose either a supported Codex app automation
or a separate hosted runner. The latter requires separately configured API
credentials/billing and repository permissions. A shell loop or cron inside an
on-demand cloud chat is not a durable scheduler and must not be described as one.

Suggested initial cadence: every two hours, one writer, with concurrency control.
Validate one manual run and its target before enabling a schedule. A trigger is
active only after the actual scheduler configuration and a successful run can
be inspected. GitHub scheduled workflows additionally must be on the default
branch and enabled; a workflow file on a feature branch is not an active schedule.
