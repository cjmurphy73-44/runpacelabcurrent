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

## Reprovisioning runbook

1. Authenticate with `npx base44 login` in the environment doing provisioning.
   Use an isolated checkout of this branch. Do not copy a production `.app.jsonc`,
   `.env` file, athlete data or OAuth credentials.
2. From that checkout run `npx base44 link --create --name TrainPaceLab-Staging`.
   Record the new app ID and verify it differs from the production app ID. Keep
   the production app linked to the existing main branch. Do not reconnect it to
   the staging app or run a deploy from a production-linked checkout.
3. Set staging visibility to private. Before deploying, omit scheduled workflows,
   connectors and agents from this isolated staging checkout unless separately
   enabled for a specific test. No COROS/Garmin real-account sync or Airtable mirror
   should run in staging. Keep production external integrations untouched.
4. Deploy the reviewed code to this new app after PR 2 backend validation passes.
   Configure only dedicated test Stripe keys, test prices and a separate test
   webhook endpoint. The current handlers still need PR 4 isolation, so never
   provide real live-mode credentials in this environment.
5. Copy `staging/manifest.example.json` to `staging/manifest.local.json`, fill in
   verified IDs/origins and run `node scripts/staging/verify.mjs`. Place Stripe test
   secrets in the provisioner's secure environment, not command arguments or Git.
   `node scripts/staging/verify.mjs staging/manifest.local.json --check-stripe`
   makes a read-only Stripe request to verify test-mode authentication. It does
   not prove secret values are installed remotely or verify webhook routing.
6. Create two synthetic users and a coach in staging using reserved `.invalid`
   email addresses. Sign in separately as each athlete to create profiles from
   `staging/athletes.synthetic.json` and link each to its actual authenticated
   user. Do not stamp fictitious `created_by_id` values or seed through a shared
   admin identity and assume RLS works. PR 3 replaces client-written links.
7. Deliver a signed Stripe test event to the staging endpoint and confirm it only
   touches staging. Verify no production record changes. Test A/B/coach/admin
   access with synthetic records and capture expected denials. The known PR 3
   access-control gap remains a release blocker even if infrastructure is isolated.

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
