# Current delivery checkpoint

Updated 8 November 2026. Use this record before starting a scheduled roadmap run.
The next work package is **reconcile the infrastructure and UI fixes, then verify
one first-time synthetic-athlete journey on their exact reviewed source**.
Do not open additional feature branches to work around missing integration.

## Source checkpoints

| Track | Source | Evidence | State |
|---|---|---|---|
| Cloud UI/session fixes | Existing PR #9 branch fix/provider-connection-feedback; source and hygiene head 0bade984023900380df15fd53c834fd151f363ef | Cloud observed: 246 tests, typecheck, lint, build, offline backend validation; six GitHub CI checks passed at this SHA; synthetic browser fixtures | Pushed; not merged. Frontend built from 2244ffba51abbcd1c8b701d914cbf14089e2c79f and published to existing staging on 8 November at 08:49 UTC; 36 editor-source files subsequently saved and read back matching Git |
| TPL-INFRA-001 guards | Local branch fix/tpl-infra-001; deployed backend SHA 936f1eb7bf95f8a18697b1949aeff81fd63f38f6; local head 76b37bca2f8afca27f0d0e073bbc31f41f83436d | Product Owner supplied VS Code CLI report: build/preflight, 186 tests, typecheck/lint/backend validation, eight staging endpoints fail closed; private app, inactive workflows | Reported implemented/deployed; commits absent from cloud object database and advertised origin branches when checked; not yet code-reviewed here |
| Staging sign-in/onboarding | Existing staging app; exact frontend revision not established here | Product Owner manually confirmed accepted sign-in, onboarding completion and dashboard arrival | Manual dashboard evidence; not an automated athlete/FIT/ownership acceptance pass |
| Production main | 3f386d4d52042940cb1767e6950ec78e33b3c81e when last fetched | Cloud read-only Git observation | Existing stack remains unmerged |

Different test/resource counts refer to different code snapshots, not conflicting
results from one combined version. No combined release candidate has been tested.
Never convert supplied reports into independent cloud observations.

## Observed staging frontend checkpoint

The explicit staging build was accepted by the supported deploy-dist endpoint.
Frontend editor source was backed up before the batch save; all 36 changed files
read back byte-for-byte matching Git. Backend source remained identical, private
visibility was preserved and exact workflow records remained inactive. No
production deployment or production data write was performed.

The anonymous browser reached the private login page without page errors. An
operator API identity was verified, but this does not provide an authenticated
athlete browser session. Hosted dashboard/FIT acceptance remains incomplete.
Private deployment manifests, backups and readback evidence are outside Git.

## Scope of the reported infrastructure work

The CLI report describes missing entity name fields repaired and a fail-closed
external-sync guard requiring an explicitly production runtime plus the explicit
enable flag. Eight provider/webhook/reporting handlers were deployed to staging
only. The staging guard returned 503, workflows were inactive with zero runs and
the app was private and distinct from production. The head after deployment adds
a synthetic FIT parser test. Inspect those commits after publication before
claiming their exact behavior or changing their deployment.

The rejected reserved-email signup attempt did not create a test account. It does
not establish that accepted staging accounts cannot work; the Product Owner's
later manual journey reached the dashboard. That Safari session is not available
to the cloud runner, and no credentials/session tokens belong in this record.

## Ordered acceptance checklist

1. **Publish the existing infrastructure branch to origin.** Preserve its local
   untracked skills and unrelated Odysseus work. Do not reset, merge or deploy.
   The cloud runner cannot read a private Mac worktree through its pathname.
2. **Inspect and reconcile the exact source.** Compare infrastructure changes with
   existing staging PR #4, CI PR #5 and the UI stack. Use the owning existing PRs;
   do not blindly merge a stack or duplicate the infrastructure implementation.
3. **Repair race-result onboarding under the correct science contract.** The cloud
   audit reproduced incompatible race-distance fields and an inappropriate
   default derivation. Do not substitute a fabricated baseline or weaken checks.
   The novice/mileage path has a local fixture pass, not full science acceptance.
4. **Validate one reviewed combined candidate.** Record exact source SHA; run
   typecheck, lint, tests, build and backend/schema validation. Do not combine old
   independent green reports and call them a combined pass.
5. **Complete authorized staging acceptance.** Fresh-read target identity and
   privacy; preserve inactive external workflows and fail-closed guards. Verify
   reviewed-code deployment only when authorized. Use an accepted synthetic
   athlete session, one synthetic FIT activity, persisted data, dashboard metrics,
   reload and the iPad UI. Capture sanitized evidence and ownership outcomes.
   Stripe is not a prerequisite for this dashboard/FIT smoke test.
6. **Follow the protected main/release path.** Owner authorizes main updates for
   verified fixes, subject to required checks/reviews. Check automatic Git-sync
   implications and the production guard configuration before any main update;
   an unconfigured guard must not unexpectedly disable live integrations. No
   standalone production deployment, production writes or bypass is authorized.

## Current external prerequisites

- Infrastructure branch must be pushed from its Mac worktree; no local-only
  commit restoration or remote access to that path has been established.
- GitHub API access to api.github.com is blocked in the cloud environment. Git
  read/push access works; PR merge/settings API access has not been established.
- Scheduled task is reported configured by the Product Owner. Its first actual
  execution, repository/environment attachment and result still need evidence.
- Do not require account passwords in chat. Keep private target records, session
  state and accepted account access in supported secure channels.

See docs/APP_AUDIT.md for the public audit summary and
 docs/AUTONOMOUS_DELIVERY.md for the recurring work and merge boundaries.

## Authorized live-release preparation

The Product Owner explicitly requested this batch on https://trainpacelab.com/
and instructed the cloud runner to proceed. The production custom-domain record
was read successfully and matches that domain; its app ID differs from staging.
Fresh checks at source 5e2a58d58ce8dba6f66fd5490b3e4d1b884e943d passed:
typecheck, lint, 246 tests in 40 files, backend validation (49 entry graphs,
28 resources), and an explicit production-targeted frontend build. Existing
catalog RLS and bundle-size warnings remain. No deployment was performed.

Release blockers observed: PR #9 is draft and targets the workout-export branch;
PR #5 remains open against main. No approved review event was visible on either
public PR page. This is not a branch-protection API attestation. Hosted athlete
acceptance remains incomplete. Outbound requests to trainpacelab.com and
api.github.com were denied with proxy 403, preventing live browser verification
and GitHub API operations. Git read/push and Base44 management reads still work.

Required next actions: allow those two hosts in environment network settings,
complete hosted athlete acceptance and obtain independent release review through
the existing PRs. Production authorization is recorded; do not ask the owner to
repeat it, bypass the review, or publish the stacked backend changes wholesale.

## 9 November: work completed while network changes are deferred

The Product Owner asked to continue independent work and leave cloud network
permissions until later. Do not repeatedly request the same settings changes.

Offline queue integrity was repaired on existing PR #9 at source
a2dd36020d573faa737695c5656ddc7034fa896f. Six regressions cover concurrent
enqueues, persistence during requests, failure, clear, unknown handlers, status
notification and backoff. Typecheck, lint, 252 tests in 41 files, backend
validation and the explicit staging build pass. Local iPad-sized Chromium
verified the real queue/status modules with synthetic data; pending data and
its honest Pending sync state survive reload. This is local browser evidence.

The supported staging deployment succeeded. Both edited frontend files were
backed up, compared against their known previous Git source, saved in Base44
and read back matching the candidate. Fresh target reads confirmed existing
private staging, distinct from production. Backend source and exact workflow
records remained unchanged; the workflows were inactive before deployment.
Private backup, deployment response, manifest, logs and browser evidence are
under cloud-setup/offline-queue outside Git. No production write was performed.

Remaining release blockers are unchanged: independent review, hosted athlete
acceptance and access to the live domain/GitHub API. The Mac-only infrastructure
commits are still needed before reviewing a combined backend candidate.
Do not treat the queue repair as ingestion, account-isolation or science
acceptance. See the audit follow-up for its remaining durability limits.

## 9 November: bounded offline failure recovery on PR #9

Completed one UX-007 follow-up on the existing provider-feedback branch: keep
unsaved changes after six failed attempts, show the failure in the status badge
and support an explicit retry. Three new regressions fail against c95b2b5 and
pass with the repair; the complete suite passes 255 tests in 41 files. Ordinary
reconnect does not replay exhausted work, and normal pending retries keep their
backoff. Typecheck, lint, build and backend validation pass locally; exact-head
CI and affected hosted behavior remain separate acceptance evidence.

This is local fixture/component evidence, not hosted athlete acceptance. No
Base44 publication, production change or Odysseus operation was performed.
The foundational staging/CI gate remains open; this ordinary usability repair
does not unlock authorization, billing, telemetry or coaching implementation.
Correction to the preceding historical entry: infrastructure work is published
on fix/tpl-infra-001 at 8bafa5178d40f0748800a18c6583253aebc241a4;
it is no longer Mac-only. Combined-candidate review and protected preservation
requirements remain outstanding.
Next atomic action: verify retained exhausted work and explicit retry across a
local browser reload with synthetic data; record hosted acceptance separately
when supported staging access is available. Deferred network settings stay deferred.

## 9 November: active implementation, Garmin boundary characterization

New owner direction permits safe offline code/tests while G0 is blocked, retaining
all release/security/billing/review and Odysseus controls. One provider/scenario
was selected: TPL-INT-006-GAR-001, the 3599/3600/3601-sample Garmin webhook boundary,
on existing PR #9. This is executable test coverage, not an ingest runtime fix.

The real handler and native decoder run with synthetic FIT bytes, serialized
in-memory SDK storage, stubbed fetch and isolated post-ingest effects. 3599/3600
samples retain every currently mapped sample; 3601 decode successfully but the
serialized workout omits streams despite HTTP success and stream-derived zones.
The desired-retention assertion is an explicit expected failure; temporarily
removing that marker confirms the ordinary assertion fails because streams is
undefined. This defect is not accepted as correct behavior or claimed fixed.

Full test/check evidence and remaining live-release blockers are in
.codex/reports/TPL-INT-006-GAR-001.md. No app source, backend, staging configuration,
workflow, credential, production record or Odysseus tracking was changed.
G0 still needs an app-wide isolation attestation accounting for owner-scoped RLS
and confirmation that the existing webhook secret is dedicated to staging;
the user was asked for provenance only, never its value. No new credentials or
admin-bypass capability are inferred from the previous caller-visible zeros.
