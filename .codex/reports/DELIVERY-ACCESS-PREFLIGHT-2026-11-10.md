# TrainPaceLab delivery-access preflight

Date: 10 November 2026 (Australia/Brisbane)

Scope: delivery access, PR/check/review state, required branch rules, and existing
automation/runner availability. This is a credential-free evidence record. No
merge, application deployment, production write, billing change, schedule change,
or code implementation was performed.

## Repository and access

- Repository: `cjmurphy73-44/runpacelabcurrent`.
- Initial checkout: branch `main`, source `3f386d4d52042940cb1767e6950ec78e33b3c81e`.
- Initial working tree had the existing modified `odysseus` item. It was left
  untouched. Inspection and this report used a separate worktree on the existing
  `chore/codex-team-setup` branch.
- Mac direct HTTPS checks: `https://trainpacelab.com` returned HTTP 200 with TLS
  verification success; `https://api.github.com` returned HTTP 200 with TLS
  verification success. These verify network/TLS reachability only.
- GitHub CLI authentication was valid in the macOS keyring for
  `cjmurphy73-44`; Base44 CLI `whoami` also succeeded. No token, device code,
  secret value, app ID, or athlete data was recorded.
- The sandboxed shell initially could not resolve either HTTPS hostname. The
  unrestricted Mac checks succeeded. The Product Owner separately reports the
  cloud workspace continues to block those hosts by network policy.

## Roadmap and delivery records read

- Latest `chore/codex-team-setup` roadmap/backlog update: commit `4b25a5e`,
  9 November 2026 (`docs/DEVELOPMENT_ROADMAP.md` and
  `docs/MVP_ATOMIC_BACKLOG.md`). Gate 0 remains open until pipeline PRs #4 and
  #5 are reviewed, merged, and post-merge/staging evidence is verified. The
  backlog identifies `TPL-INT-006-GAR-002` as the next Garmin retention repair.
- Read `fix/provider-connection-feedback` delivery status and coach staging
  report. PR #9's current head is `7db30bb`; it includes settings entry commit
  `7342d89`. The report records an existing private staging rollout and inactive
  external workflows, but does not certify global owner/RLS isolation or the
  automated hosted synthetic FIT-to-dashboard journey.
- The partial Garmin retention repair remains an uncommitted cloud-workspace
  change. It was not recreated, overwritten, or continued during this preflight.
  Obtain a source handoff of that preserved patch before continuing GAR-002.

## PRs #4–#9: live state at preflight

All six required CI contexts passed at the listed current PR heads when queried.
No PR had a review submitted. PRs #4 and #6–#9 were drafts; #5 was not a draft
but had `REVIEW_REQUIRED`.

| PR | Head SHA | State | Review | Required CI |
|---|---|---|---|---|
| [#4](https://github.com/cjmurphy73-44/runpacelabcurrent/pull/4) | `756debedfd46a8e6c47825f0cd692d4e078042fc` | Open, draft | None | All six pass |
| [#5](https://github.com/cjmurphy73-44/runpacelabcurrent/pull/5) | `ef1a1328841ddce47e91e04f818888ceaca3a647` | Open | Review required; none submitted | All six pass |
| [#6](https://github.com/cjmurphy73-44/runpacelabcurrent/pull/6) | `0b1ea8272c005347fcde0a70361d28fcef9d92ab` | Open, draft | None | All six pass |
| [#7](https://github.com/cjmurphy73-44/runpacelabcurrent/pull/7) | `ad7d0a9d4e57885ede3d20f424e7f59a2ed853ed` | Open, draft | None | All six pass |
| [#8](https://github.com/cjmurphy73-44/runpacelabcurrent/pull/8) | `cf46f922e6adf7a332202cebad80c389e09945bd` | Open, draft | None | All six pass |
| [#9](https://github.com/cjmurphy73-44/runpacelabcurrent/pull/9) | `7db30bb703025f71ab5d29c19d966b6153ecbd55` | Open, draft | None | All six pass; exact-head rerun passed |

The six required contexts are Typecheck, Lint, Build, Backend, Tests, and CI
required. The PR #9 checks were present on its exact current SHA; they were not
missing in the live state. GitHub Actions run `42603827063` was rerun through
GitHub CLI as attempt 2 at that same SHA and completed successfully. All six
contexts passed on the rerun. No check was weakened or skipped.

## Main-branch rules

The active repository ruleset `TrainPaceLab reviewed main` targets `main` and
requires:

- all six CI contexts above, with strict up-to-date status checks;
- one approving review, approval after the latest push, and resolved review
  threads;
- linear history, no branch deletion, and no non-fast-forward updates.

No bypass actors are configured; the ruleset reports bypass as unavailable to
the current account. The classic branch-protection endpoints return 404, but the
active ruleset is the effective protection configuration. PR #5 still needs its
independent approval. PR #4 remains draft pending acceptance evidence.

## Hourly automation and runners

- The roadmap/backlog records an existing hourly ChatGPT Scheduled task and
  explicitly says it was not duplicated or modified. No scheduler-control tool
  is exposed in this session, so the task's live configuration and first run
  could not be independently inspected.
- This Mac has no non-comment `crontab` entries and no matching Codex/TrainPaceLab
  LaunchAgent. The GitHub repository has zero self-hosted Actions runners.
- The existing CI workflow uses GitHub-hosted `ubuntu-latest` runners and is
  triggered by push, pull request, or manual `workflow_dispatch`; it has no
  hourly schedule. A separate Codex Action/runner alternative is documented as
  requiring secure API-key setup and a reviewed manual workflow; it is not
  configured or active.
- No schedule was created or changed.

## Remaining release blockers

1. Gate 0 is not complete: PRs #4 and #5 are unmerged. PR #5 needs independent
   approval; PR #4 remains draft until staging acceptance is complete.
2. PRs #6–#9 are also draft and unreviewed. Passing CI does not satisfy the
   ruleset or authorize merging.
3. Staging evidence does not yet establish app-wide owner/RLS isolation and
   dedicated webhook-secret provenance. The hosted synthetic FIT persistence,
   ownership, dashboard reload, and iPad journey are not independently automated
   by this preflight; the delivery record distinguishes the owner's manual
   dashboard confirmation from those checks.
4. The production external-sync guard requires explicit production environment
   and enable configuration. That production configuration was not inspected or
   changed; validate it through a separately authorized release process before
   any main update that could synchronize code to production.
5. The preserved partial Garmin retention patch needs a source handoff from the
   cloud workspace before GAR-002 continues. No replacement implementation was
   started.
6. The documented hourly task's live schedule/run remains unverified because no
   scheduler-control surface is available; no duplicate was created.

## Next action

Request the source handoff for the preserved uncommitted GAR-002 patch before
continuing its implementation. Keep the protected PR/review and staging evidence
gates in force; do not merge or deploy from this preflight.
