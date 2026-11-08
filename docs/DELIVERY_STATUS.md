# Current delivery checkpoint

Updated 8 November 2026. Use this record before starting a scheduled roadmap run.
The next work package is **reconcile the infrastructure and UI fixes, then verify
one first-time synthetic-athlete journey on their exact reviewed source**.
Do not open additional feature branches to work around missing integration.

## Source checkpoints

| Track | Source | Evidence | State |
|---|---|---|---|
| Cloud UI/session fixes | Existing PR #9 branch fix/provider-connection-feedback; source and hygiene head 0bade984023900380df15fd53c834fd151f363ef | Cloud observed: 246 tests, typecheck, lint, build, offline backend validation; six GitHub CI checks passed at this SHA; synthetic browser fixtures | Pushed; not merged; not deployed to the Base44 staging app by the cloud agent |
| TPL-INFRA-001 guards | Local branch fix/tpl-infra-001; deployed backend SHA 936f1eb7bf95f8a18697b1949aeff81fd63f38f6; local head 76b37bca2f8afca27f0d0e073bbc31f41f83436d | Product Owner supplied VS Code CLI report: build/preflight, 186 tests, typecheck/lint/backend validation, eight staging endpoints fail closed; private app, inactive workflows | Reported implemented/deployed; commits absent from cloud object database and advertised origin branches when checked; not yet code-reviewed here |
| Staging sign-in/onboarding | Existing staging app; exact frontend revision not established here | Product Owner manually confirmed accepted sign-in, onboarding completion and dashboard arrival | Manual dashboard evidence; not an automated athlete/FIT/ownership acceptance pass |
| Production main | 3f386d4d52042940cb1767e6950ec78e33b3c81e when last fetched | Cloud read-only Git observation | Existing stack remains unmerged |

Different test/resource counts refer to different code snapshots, not conflicting
results from one combined version. No combined release candidate has been tested.
Never convert supplied reports into independent cloud observations.

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
