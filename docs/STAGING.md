# PR 1: staging and branch isolation

Status: **partially provisioned; acceptance incomplete** (2026-11-08).
A separate private staging app has been created.
Main protection is active. This PR remains draft until the remaining acceptance
checks below pass. A private clone alone does not establish tested isolation.

## Provisioning progress

A separate staging app has been created and its visibility restricted. Scheduled
external sync and mirroring are inactive. The clone flow was completed without
supplying secrets or connecting external integrations. Environment identifiers
and administrative URLs are intentionally omitted from this public repository.

Acceptance remains incomplete: direct athlete-table inspection is blocked by a
blank Data page, distinct synthetic athlete/coach sessions are not yet created,
and Stripe test credentials and signed-event routing are not configured or
verified. The clone has not been updated to the reviewed PR code. Browser login
does not establish CLI authentication. Keep this PR draft, and hold PR 3 submission
until staging acceptance is complete.

Main protection is now active with no bypass actors: linear history, PR review,
resolved conversations, blocked deletion/force pushes and strict required
Typecheck, Lint, Build, Backend, Tests and CI required checks. PR #5 and the stacked
staging branch both passed CI before this documentation update.

Before deployment, authenticate the CLI and explicitly link an isolated checkout
to the existing staging app. Do not repeat the create step below. Production
deployment state and rollback checkpoint still require verification.

## Infrastructure reconciliation and Odysseus preservation (2026-11-09)

The previously local `fix/tpl-infra-001` branch is now available on origin
at `76b37bc`, nine commits ahead of `main` (`3f386d4`). It overlaps this
staging PR and CI PR #5; do not merge its full commit stack into either PR
without a file-by-file reconciliation and exact-head validation.

**Merge blocker:** the infrastructure comparison removes the tracked
`odysseus` gitlink. The owner's Mac reports modified content in that
submodule. Removing a gitlink from the parent repository does not prove
that its nested repository, working files, local commits or dependencies
are preserved. Before accepting that removal, inventory the nested Git
repository, its remotes, status, reachable commits, untracked files and
relative-path dependencies. Make a separately verified backup or independent
checkout with all local work preserved. Do not reset, clean, delete or
relocate the owner's directory through an unattended job.

The external-sync guard on the infrastructure branch enables provider
activity only when both `TPL_ENVIRONMENT=production` and
`TPL_EXTERNAL_SYNC_ENABLED=true`. Keep staging fail-closed, and verify
production runtime configuration and release implications **read-only**
before any protected main merge. A green offline test is not proof of
hosted staging isolation or production integration continuity.

## Verify the existing staging app (do not recreate it)

The private staging app has already been provisioned. Do **not** run
`base44 link --create`, create another app, or assume a blank Data page
means the existing app is missing. This section supersedes the older
reprovisioning instructions.

1. In an authorized staging-only checkout, authenticate the Base44 CLI and
   make a read-only scoped call to the **existing** staging app. Compare its
   app ID and origin with the private staging record and production record;
   never commit or print private identifiers or authentication output.
   If access or target identity is ambiguous, stop without relinking.
2. Read back staging visibility and external integration/workflow states.
   Confirm private access, distinct production/staging identities, inactive
   scheduled sync and mirroring, disconnected Garmin/COROS providers, and
   absence of live billing credentials. Record sanitized pass/fail results
   outside Git. Do not infer remote isolation from a local manifest.
3. Before any approved staging write, verify the exact reviewed source SHA,
   existing staging link and editor-source backup. Never replace backend
   handlers or activate workflows as part of a frontend smoke test.
4. After the source and target gates pass, deploy only the specifically
   approved candidate to the existing staging app and privately record its
   deployment identity. This does not authorize production deployment.
5. Copy `staging/manifest.example.json` to
   `staging/manifest.local.json`, supply verified private values and run
   `node scripts/staging/verify.mjs`. Its fail-closed offline checks are
   supplementary, not hosted-environment acceptance.
6. Use distinct, supported authenticated synthetic athlete and coach
   sessions for ownership checks, FIT upload, persistence and dashboard
   reload. Do not fabricate ownership IDs or send invitations to invented
   email addresses. Stripe is **not** a prerequisite for this smoke test.
7. Dedicated Stripe test keys, prices and signed webhook routing are
   separate billing-gated acceptance steps. Never provide live credentials
   to staging or enable production billing here.

Run `npm ci` then `npx vitest run scripts/staging/verify.test.mjs` for the local
guardrail regression tests. They also run in the restored PR 2 test suite.

The preflight is intentionally fail-closed for placeholders, shared app IDs,
production hosts and live billing credentials. App IDs are trimmed before
comparison, and trailing-dot hostname aliases are rejected so alternate
spellings cannot bypass the production-target check. It cannot attest to remote
isolation based solely on a local manifest; its output says so explicitly.

## Apply and verify main rules

After PR 2 reports the named GitHub Actions checks, a repository administrator
can apply `.github/rulesets/main.json` through GitHub Settings or with an
authenticated GitHub CLI:

```bash
gh api --method POST repos/cjmurphy73-44/runpacelabcurrent/rulesets \
  --input .github/rulesets/main.json
gh api repos/cjmurphy73-44/runpacelabcurrent/rules/branches/main
```

Review any existing same-name rule before creating one; update it by ID rather
than creating duplicates. The payload enforces PR review, resolved conversations,
linear history, no force pushes/deletion, and all five checks plus `CI required`.
Checks are bound to GitHub Actions app ID 15368; confirm that source on the real
PR before applying. No permanent administrator or Builder-bot bypass is granted.
An independent human reviewer is needed because authors cannot approve their own
PR. If necessary, add a trusted reviewer rather than silently disabling review.

Require strict checks on the current merge base. Freeze direct Base44 editor
writes while using protected main; do not defeat protection with a blanket bot
bypass. Use squash or rebase merges. Verify the GitHub plan supports these rules
if repository visibility is later made private.

## Evidence required before marking this PR ready

- Separate app IDs, staging URL, workspace and private visibility confirmed.
- No production data copied; synthetic users have distinct authenticated owners.
- Dedicated Stripe test account/keys and endpoint confirmed without recording secrets.
- Signed test event reached staging only; scheduled sync/mirroring is disabled.
- Main's effective branch rules show linear history and required CI checks.
- PR 2 is green; published production SHA and rollback checkpoint recorded.
- Base44 merge/redeploy behaviour tested: workflows and permission changes may
  take effect before frontend Publish. No production merge or publish is part of
  preparing this PR.

Rollback: remove only the staging app's synthetic test records/integrations if
necessary. Revert this PR for repository helpers. Changes to remote rulesets and
app configuration require their own reviewed rollback; a Git revert does not undo
them. Record completion evidence in the PR rather than marking this checklist
complete from local preflight output.

## 9 November 2026 — evening app-release handoff (not deployment authorization)

**Candidate staging branch:** PR #4 `fix/staging-isolation`, source
`169f6dffcf833d7e3d550ca6aa4b5060ba96040d` before this handoff note.
[GitHub Actions run 42549488120](https://github.com/cjmurphy73-44/runpacelabcurrent/actions/runs/42549488120)
completed successfully: Build, Lint, Typecheck, Tests, Backend and CI required.
PR #5 `fix/ci-restoration` passed the same six checks at
`ef1a1328841ddce47e91e04f818888ceaca3a647`
([run 42547567560](https://github.com/cjmurphy73-44/runpacelabcurrent/actions/runs/42547567560)).
These are branch-specific checks, **not** a tested combined release candidate.

Today's bounded changes on PR #4: corrected the runbook to use the **existing**
private staging app; removed app identifiers/origins from preflight stdout;
added a subprocess regression test and corrected its CI path resolution;
rejected loopback, private-network and reserved local origins in the manifest
validator with regression coverage. PR #5 recorded exact-head CI and the
fail-closed invitation source review. No athlete-facing functionality is claimed
to have shipped from these changes.

**Evening decision: HOLD app push until gates pass.** Required independent
review is not recorded; PR #4 remains draft and stacked on PR #5. Hosted
staging acceptance is incomplete (provider token/config isolation, distinct
synthetic athlete/coach sessions, FIT persistence/dashboard reload and exact
reviewed deployment). The private Base44 management browser observations in
`.codex/reports/TPL-G0-002.md` establish partial isolation only; its Data
page remained blank. Do not treat offline manifest checks or green CI as hosted
isolation proof. Odysseus local modifications/history remain protected and its
removal-bearing gitlink change must not be merged without verified preservation.

Before any evening app update, independently review the precise frontend and
backend diff, verify staging identity/privacy and inactive external workflows,
back up editor source, confirm the candidate SHA and staging deployment target,
run the synthetic athlete-to-dashboard acceptance journey, and record sanitized
results. Obtain required independent GitHub approvals and exact-head checks.
Do not merge the full stacked chain or deploy backend/billing/provider changes
on the strength of these checks. Any separate production publish needs its own
reviewed release scope, confirmed automatic Git-sync effects and explicit
release controls; do not modify production data, credentials or workflows.

This handoff records the work for a later operator; it does **not** schedule,
trigger or perform an app deployment. The next atomic task is to obtain a
supported metadata-only staging provider/config isolation attestation without
exposing tokens or health data.
