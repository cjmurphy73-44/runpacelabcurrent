# PR 1: staging and branch isolation

Status: **not provisioned or verified**. Base44 CLI authentication is unavailable
in the execution environment. GitHub main is currently unprotected and has no
rulesets; the connected GitHub API cannot perform administration writes. This PR
provides executable preflight checks and the exact proposed ruleset. It must stay
draft until the evidence below is recorded. A Git branch alone is not staging.

## Separate staging app

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

The preflight is intentionally fail-closed for placeholders, shared app IDs,
production hosts and live billing credentials. It cannot attest to remote
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
