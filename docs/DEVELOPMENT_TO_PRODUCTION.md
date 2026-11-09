# TrainPaceLab development-to-production workflow

Read-only checkpoint: 9 November 2026. Existing source repository:
`cjmurphy73-44/runpacelabcurrent`. This describes a proposed controlled release
process; it does not authorize a release or certify a completed rollback drill.
Current authority: no production deployment/data writes; required reviews remain.

## Verified access and hosting

| Surface | Current evidence | Gap |
| --- | --- | --- |
| GitHub | Git fetch/push access established; #4–#9 refs readable | API blocked; effective protections and authenticated review state not verified |
| Base44 | Authenticated management app, schema, names-only secrets, function and workflow reads work | Current shared-browser control unavailable; native CLI auth is separate |
| Existing staging | Distinct private app; two workflows inactive by exact list/detail IDs; 47 functions | Full credential/data isolation and hosted synthetic-athlete acceptance incomplete |
| Live website | Base44 attaches trainpacelab.com to configured public production app; 45 functions | Direct domain verification blocked; attachment is not current DNS/TLS/DOM proof |
| Garmin/COROS | Production configuration names and runtime source present | Live auth, scope and native-data fidelity unverified; staging has no provider credentials |
| Stripe | Production lists test and live configuration names | No staging billing names; key mode/webhook/entitlement behavior unverified |

The production site revision and individual backend revisions differ. GitHub
source, Base44 editor source, site publication, function deployment and external
workflow state are separate checkpoints. The repository README's general Git
sync statement does not prove every branch push becomes a live release.

A prior production connection observation reports the TrainPaceLab repository,
shared mode and an active webhook; that is cached evidence, not a current
configuration attestation. The documented GitHub connection GET can attempt to
repair a broken connection, so it was deliberately not called during this strict
read-only audit. App metadata's empty github_repo_url field is not proof of no
Git integration. Vercel preview-comment checks are not evidence Vercel serves
this custom domain. Do not change hosting/DNS or reconnect Git to investigate.

## One primary workspace, one atomic change

1. Read AGENTS, the canonical backlog/roadmap on existing PR #6, the delivery
   contract on existing PR #9 and latest user scope. Acquire the writer lock.
2. Refresh remote heads, exact-head CI/reviews and the selected task's gates.
   Reuse the owning branch; preserve other writers and Odysseus. No stack merge.
3. Develop only the eligible bounded scenario. Use synthetic fixtures first;
   inspect the diff and run meaningful regression and required checks.
4. Prepare a release manifest naming frontend source/tree, build inputs and
   artifact checksum, app target, each backend entry/dependency graph, entity
   schema version, secret names/mode attestation and exact workflow status IDs.
   Keep private identities and credentials outside Git. A site SHA alone is insufficient.
5. On authorized staging writes, fresh-read the private target; preserve inactive
   external workflows and fail-closed guards. Back up editor source and artifact.
   Never overwrite unrecognized edits. Keep frontend and backend batches explicit.
6. Verify a supported synthetic athlete session, persisted profile/FIT, source
   channels/sample counts/metrics, dashboard, reload and iPad UI on that exact
   candidate. Keep fixture, manual and actual hosted evidence separate. Stripe
   is not a prerequisite for the dashboard/FIT smoke; billing has its own gate.
7. Obtain required independent review and exact-head checks; verify effective
   branch rules and original-Mac preservation before any removal-bearing merge.
   Confirm Git sync effects before a protected main update. No force/bypass.
8. Only with separate production-release approval, release the approved manifest
   using the supported hosting path. Independently approve backend/schema/billing
   changes; do not deploy the stacked branch wholesale or enable staging as production.
9. Verify the live custom domain, build marker/assets, authentication/dashboard,
   error handling and each changed backend path with approved non-destructive
   probes. Compare actual served assets and function graph hashes with the
   manifest. Record limitations; a successful upload response is not athlete acceptance.

## Publishing and rollback boundaries

Base44 deploy-dist publishes a complete prebuilt frontend archive immediately.
It replaces the published site and does not change editor source, functions or
entities. The separate coding/write-batch endpoint saves editor files without
publishing. The normal deploy endpoint publishes a selected saved version/main
build. None was invoked in this read-only run. Do not treat manual Git sync as a
read operation: it can push the app's saved version to the repository main line.

Before approving a release, retain the previous frontend artifact/checksum and
exact source/build config, Base44 deployment/checkpoint identity and per-function
source/dependency hashes. Archive safe schema/config metadata and assess data
compatibility separately. A prior Git commit is not a backup of production data.

Rehearse a frontend restoration on authorized staging with its own staging-bound
artifact, preserving backend guards and workflows. Production restoration needs
separate approval and the correct production-bound prior artifact; never publish
a staging-bound build to production. Backend rollback is a separate reviewed
function/dependency restoration. Schema/data changes require an explicit recovery
plan; a code rollback cannot reverse payments, provider side effects or data loss.
No production rollback was executed or verified by this audit. The previous
production served archive and complete dependency manifest are not yet captured,
so rollback readiness remains unverified despite the recorded site checkpoint.

## Exact access remedies

- **Network:** in this cloud environment's settings, preserve current allowed
  hosts and add trainpacelab.com and api.github.com. Save/apply through the
  supported settings flow, then recheck observed policy readiness and fresh
  requests. Do not put tokens into a domain rule. Existing Base44/staging/GitHub
  hosts must remain. These edits are deferred at the owner's request.
- **GitHub controls:** once API networking works, verify supported GitHub identity
  and least-privilege repository access, PR reviews and effective branch rules.
  Supply any missing authentication only through secure settings/sign-in. Network
  permission alone does not confer repo review/merge access. Do not request passwords.
- **Base44 browser:** use a task/client exposing shared desktop browser-control
  tools; sign in/device-approve directly in that browser. This API credential is
  not a browser session. Never paste session tokens/passwords into chat or invent
  a cookie to bypass private visibility. A fresh accepted synthetic athlete
  browser identity is separately required for hosted acceptance.
- **Staging isolation:** obtain a supported app-wide count/isolation attestation
  accounting for owner RLS without returning provider rows, plus private
  confirmation the existing webhook secret is dedicated to tests. Do not replace
  it, read its value or weaken RLS merely to get a green check.
- **Provider pilot:** after gates, approve one provider/scenario/test athlete.
  Register explicit environment-owned callbacks and a dedicated consenting test
  identity; keep credentials in secure app settings. Garmin's source expects
  GARMIN_CLIENT_ID, GARMIN_CLIENT_SECRET and GARMIN_API_BASE; callback and endpoint
  overrides include GARMIN_REDIRECT_URI, GARMIN_AUTHORIZE_URL, GARMIN_TOKEN_URL.
  COROS expects COROS_MCP_CLIENT_ID, with COROS_REDIRECT_URI and optional
  COROS_WEBHOOK_SECRET for the respective paths. Current fallback callbacks refer
  to Base44 hosting/runtime; compare the provider registration with the actual
  target before consent. No registration correctness is established here.
- **Provider network:** approve only the tested destinations when a pilot is
  authorized: Garmin source uses connect.garmin.com and diauth.garmin.com plus
  the privately configured data API host; COROS uses mcpus.coros.com. Callback
  destinations require their own approved target verification. Do not infer the
  configured Garmin data host from a secret name. Backend runtime egress and
  this cloud runner's network policy are separate controls.
- **Guard/pilot design:** the existing guard only permits explicit production
  plus an opt-in flag. Do not label staging production or enable workflows to
  bypass it. A bounded synthetic/provider pilot requires its separately reviewed
  safe design; this document does not alter that guard.
- **Billing:** configure a dedicated Stripe sandbox on staging only after secure
  scope approval; verify test mode, prices and signed-event routing separately.
  Never copy production keys or require payment setup for the dashboard smoke.
- **Odysseus:** the original-Mac operator must verify independent Git history,
  modified/untracked/needed ignored files, a private restored backup and original
  launcher paths as specified in ODYSSEUS_PRESERVATION.md. Keep originals in place.
  No cloud gitlink pointer or clean checkout substitutes for this evidence.

See the [metadata-only task report](../.codex/reports/TPL-G0-002-metadata-followup.md)
for exact source/check checkpoints and what remains unverified.
