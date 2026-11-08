# TrainPaceLab development roadmap and recurring work contract

Updated: 2026-11-08. Brand: TrainPaceLab only.

## Product direction and team setup

The launch target is a dependable Garmin/COROS athlete journey, trustworthy
training/recovery data, one practical coaching loop and reliable paid access.
See docs/MVP_RELEASE_CRITERIA.md for release evidence and deferred scope.

Initial implementation roles: engineering-lead, platform-engineer, qa-reviewer.
An on-demand competitive-intelligence analyst researches public products, user
journeys, integrations, pricing and marketing to inform Product Owner decisions.
Competitive recommendations do not automatically become implementation tasks.
The analyst must not infer private algorithms or fidelity from marketing copy.

Role definitions and assignment contracts live in .codex/. The first execution
report is .codex/reports/TPL-001-initial-review.md. Saving these files does not
install the local coding schedule or establish agent discovery on the Mac.
The separate web GitHub oversight checker runs every two hours.

## Product Owner priorities: data quality and visual assets

Direction confirmed on 8 November 2026:
- Complete, trustworthy COROS/Garmin data and useful athlete analysis are core
  MVP requirements, not a later integration polish task. Prioritize this work
  when its privacy/security prerequisites are satisfied. Both provider journeys
  need independent evidence; shared code or one provider's pass is insufficient.
- Imagery, logo and supporting assets need a deliberate quality pass. Create or
  improve assets when they help; rework or omit imagery that fails the quality,
  relevance, accessibility or performance bar. Decoration is not a substitute
  for a working data journey. Branding remains TrainPaceLab only.
- Keep one delivery checkpoint: read docs/DELIVERY_STATUS.md from the existing
  provider-feedback branch until that document is merged. The reported local
  TPL-INFRA-001 commits must be published before cloud review/integration.

The detailed data acceptance contract is in Gate 3 below. Visual work packages
are defined after the foundational gates. These additions do not authorize
production writes, real-health-data collection or activating staging external
sync without the separate bounded-test prerequisites.

## Purpose and authority

Improve the product through small, tested, reviewable changes. Completion means
observable acceptance evidence, not a rewritten plan or a green mock alone.
This roadmap does not override newer explicit user instructions or repository rules.

Repository: cjmurphy73-44/runpacelabcurrent.

Pipeline numbers describe work packages. They are NOT GitHub PR numbers:
pipeline PR 1 is GitHub #4; pipeline PR 2 is GitHub #5.
Pipeline PR 5 means Ingestion & Telemetry, not GitHub #5.

## Current checkpoint

- GitHub #5, CI restoration, head 5db1f34: ready for review; all required checks
  passed when last inspected. Required independent approval is outstanding.
- GitHub #4, staging/isolation, head 77e7116: draft, stacked on fix/ci-restoration.
- Main is protected. Neither PR was merged when this document was prepared.
- A private staging clone was previously created with secrets omitted, external
  integrations disconnected and sync/mirroring workflows inactive.
- Local operator reports Base44 and GitHub authentication now work and the
  existing staging app is linked in a separate temporary worktree.
- Current remote staging configuration, reviewed-code deployment, distinct
  synthetic user sessions and Stripe sandbox routing still require evidence.
- Authorization experiments in another checkout were stopped. They are not an
  approved dependency or starting point. Preserve them without merging/deploying.
- Re-check live state at each run. Do not present this checkpoint as live proof.

## Mandatory execution boundaries

1. Complete pipeline PRs 1 and 2 FIRST. Do not attempt authorization, billing,
   telemetry or coaching implementation until BOTH are merged AND verified.
2. No direct main edits, force pushes, protection bypass or self-approval. The
   owner permits protected main merges of verified fixes after required checks,
   reviews and affected-behavior acceptance. Production publishing and production
   data changes remain separately controlled; inspect automatic Git-sync effects.
3. All integration/PR runtime tests use the isolated staging backend, synthetic
   athlete data and dedicated sandbox Stripe credentials. Offline CI tests are
   separate evidence and cannot establish staging isolation.
4. Verify the target app ID against the private environment record before every
   remote write. Reject a production target. Never create another staging app
   simply because discovery or authentication failed.
5. Keep scheduled device sync and external mirroring inactive in staging unless
   explicitly enabled for a bounded sandbox test.
6. Preserve unrelated edits, especially the modified odysseus item. Use a
   dedicated worktree. Never reset/stash/delete user work to make checks pass.
7. Secrets, athlete data, private app IDs/admin URLs, raw health recordings and
   authentication output must not enter this public repository or CI logs.
8. No repeated authentication loops. A whoami result does not prove app access:
   verify one read-only scoped API call as well. Report the failing operation.
9. No messages, invitations, emails, review requests or public issue comments to
   other people without explicit authorization. PR code/body updates are allowed
   within the approved work package. Human review remains independent.
10. Do not expand permissions, weaken checks, or silently change numerical
    semantics to get a green run.

## Ordered delivery backlog

### Gate 0: finish staging and CI (pipeline PRs 1 and 2)

Next actions, in order:
- Confirm GitHub #5 checks on its exact current SHA and required review status.
- Identify existing staging and production apps through authenticated read-only
  calls. Keep IDs private. Verify distinct IDs/origins, staging privacy, disabled
  workflows, disconnected providers, and absence of production credentials.
- Prepare reviewed code in a staging-only checkout with no active external
  workflows/connectors. Confirm its app link before deployment.
- Deploy only reviewed PR 1/2 code to staging. Record exact source SHA and
  deployment identity. Test access and functionality there.
- Establish two distinct synthetic athlete sessions and a synthetic coach.
  Do not fake created_by_id or assume admin-created records prove ownership.
  Use a supported test-account mechanism; do not send messages to invented emails.
- Configure dedicated sandbox Stripe keys/prices and endpoint through secure
  local tools. Verify test mode and signed-event delivery to staging only.
- Record production rollback/deployment checkpoint read-only. Do not execute it.
- Keep #4 draft until evidence is complete. Review #5 independently; after its
  merge, retarget/update #4 to main without rewriting someone else's work.
- Confirm both merges, CI and staging smoke evidence before unlocking Gate 1.

Done when:
- Typecheck, Tests, Backend/schema validation, Lint, Build and CI required pass on
  exact reviewed SHAs. Warnings and offline-validator limits are disclosed.
- Staging acceptance evidence is recorded without credentials/private metadata.
- Independent review and protected merges have occurred for both PRs.
- Post-merge state is verified. A successful check alone does not satisfy this gate.

### Gate 1: ownership and access control (pipeline PR 3)

Dependencies: Gate 0 complete. Submit for authorization/security review.
- Remove client writes to every authorization-driving field, including profile
  links and coached-athlete caches. Preserve platform authority over user roles.
- Server-authenticated ownership resolution; a formerly writable link is not
  evidence of ownership. Handle ambiguous legacy ownership through reviewed repair.
- Athlete consent precedes coach access; server-authorized grants and revocation.
  Never migrate untrusted client assignments into trusted grants automatically.
- Audit service-role functions and every athlete-scoped read/write path.
- Test athlete A/B, coach, revoked coach, admin and anonymous access against stage.
  Include spoofed links, cross-athlete writes and direct SDK mutation attempts.
Done: expected denials verified remotely, owner journeys work, reviewer approves.

### Gate 2: billing integrity (pipeline PR 4)

Dependencies: Gate 1 accepted and merged.
- Enforce separate test/live credentials, webhook secrets, modes and prices.
- Provision only from verified paid events with correct mode, identity and amount.
- Durable event idempotency and atomic single-use access-code redemption.
- Verify the platform's real conditional mutation/transaction guarantees.
  Do not invent SELECT FOR UPDATE support or claim atomicity from sequential calls.
- Test replay, concurrent redemption, duplicate delivery, wrong mode and failures.
Done: no double provisioning; one-use code has one winner under concurrency.

### Gate 3: ingestion data fidelity (pipeline PR 5)

Dependencies: billing gate accepted and merged.
Audit COROS, Garmin and manual FIT/TCX/CSV uploads end to end:
- Every supported sync attempts raw files or high-resolution streams by default,
  on initial ingestion, including both background workers and webhooks.
- Summary-only is an explicit last-resort state when the provider confirms no
  recording is available/manual activity/restriction. Store reason and provenance.
- Network errors, authentication expiry, rate limits, missing links and parser
  failures remain visible and retryable; never label them no-telemetry success.
- Preserve timestamps, sampling intervals, heart rate, power (cycling/running),
  cadence, elevation, speed, distance and available secondary channels.
- Retain full raw recordings and channel precision. Test long sessions, sparse/
  duplicate timestamps, laps, pause/resume, valid zeros, missing values and units.
- Verify pagination, idempotency, channel reconciliation and historical refetch.
- Record provider/source/version evidence; distinguish mocks, sandbox/provider
  restrictions and verified real API behavior without exposing athlete data.
Done: supported initial sync stores complete telemetry without manual backfill;
provider matrix and round-trip fixtures show no truncation or silent channel loss.

#### TPL-DATA: full provider recording to useful athlete output

Use bounded vertical slices rather than adding more providers or summary-only
success paths. Work one eligible slice at a time; release requires BOTH COROS
and Garmin evidence.

| Item | Acceptance evidence |
| --- | --- |
| TPL-DATA-001: provider capability and access matrix | For COROS and Garmin separately, record tested device/activity/API scope, available raw-file/stream/recovery endpoints, approval restrictions, and fields genuinely unavailable. Do not promise a field that the provider does not expose. Credentials and account identifiers remain private. |
| TPL-DATA-002: complete initial and repeat ingest | Initial, historical, webhook/background and manual recovery paths retain the original recording when supported and all available native-resolution channels. Preserve sample counts, precision, timestamps/timezones, units, laps, pause/resume, valid zeros and provenance. No one-hour/sample cap silently omits longer streams. |
| TPL-DATA-003: correctness and recovery | Athlete ownership is verified. Pagination, refresh, expired authorization, rate limits, partial failures and resume work without silent loss. Stable provider IDs and tested reconciliation prevent duplicates across retries/providers/manual imports without merging unrelated activities. Preserve the original data for reprocessing. |
| TPL-DATA-004: trustworthy analysis | Explicit, tested inputs drive workload, CTL/ATL/TSB, HR-zone time, intensity and recovery interpretations. Match frontend/backend semantics and athlete constants; label estimated versus measured metrics. Never manufacture a stream from averages or treat missing data as a measured zero. |
| TPL-DATA-005: understandable athlete journey | The athlete can see what arrived, source/freshness/completeness, supported analyses, limitations and a clear next training/recovery action. Connection success is distinct from retrieved-data and completed-analysis success. Verify reload and repeated sync. |

For each slice, retain a private end-to-end evidence chain: authorized provider
activity/reference -> raw asset checksum/size -> decoded native channels and
sample/time coverage -> persisted athlete-owned records -> deterministic
analysis inputs/outputs -> sanitized dashboard evidence. Tests must include
long activities, intervals/laps, pauses, sparse/missing channels, duplicates and
provider failures. Re-sampling or exclusions require an explicit reason; no
silent precision reduction, fabricated telemetry or summary-only fallback on a
retryable fetch/parser error.

Implementation uses synthetic recordings and provider fixtures first. A genuine
provider acceptance pilot requires a separately authorized consenting test
account and an appropriate private environment; do not import real health/GPS
data into synthetic staging or public logs. Keep external sync disabled except
for a specifically authorized bounded provider test. UI claims follow the
actual tested capability matrix, not implementation presence alone.


### Gate 4: science parity and non-blocking coaching (pipeline PR 6)

Dependencies: ingestion gate accepted and merged.
- Shared deterministic raw-input golden fixtures exercise both runtime engines.
- CTL/ATL/TSB and Banister TRIMP match across frontend/backend under identical
  inputs, initialization, time constants, units, day boundaries and rounding.
  State whether equality is numeric or serialized; do not hide drift in tolerance.
- 42/7 days are defaults, not a license to ignore configured athlete constants.
- Average-based Banister TRIMP remains available for summary-only sessions with
  explicit provenance. Edwards load and time-in-zone require verified HR streams.
- No stream means zone-derived contribution is zero/excluded, NOT a measured
  zero-intensity workout. Missing channels stay missing.
- Explicitly distinguish the general session-load model from the coach's verified
  stream-history model so summary exclusion cannot silently alter displayed load.
- AI receives deterministic, provenance-labelled context; it never invents or
  computes physiological metrics. Banister impulse-response fitness/fatigue and
  EWMA CTL/ATL are distinct models, even if both inform coaching.
- No AI hold blocks workout access, ingest, analytics or dashboard rendering.
- Mixed/pending/summary-only timelines use the last verified stream state, with
  its timestamp. No verified history yields an honest limited-data notice.
- Exact fallback notice:
  "AI Insights running on verified stream history (Summary-only sessions excluded)."
- Tests cover complete streams, mixed timelines, pending processing, missing
  history, failed coach service, stale context and invalid numeric inputs.
- Validate complete plan inputs before changing active schedules. Use supported
  atomic commit semantics or a tested fail-safe commit workflow.
- Historical recalculation is a separate dry-run migration with before/after
  diffs, review and rollback design; never run on production autonomously.
Done: numerical parity and uninterrupted core journeys verified in staging.

### Gate 5: resumable account deletion (pipeline PR 7)

Dependencies: science/coaching gate accepted and merged.
- Durable cleanup jobs with checkpoints, bounded retries and idempotent steps.
- Cancel Stripe subscription, revoke providers, remove private assets and all
  athlete-scoped health/telemetry records including service-created data.
- Enumerate scope and retention obligations; never claim compliance from a test.
- Test failure/retry at each stage without claiming completion early.
Done: sandbox end-to-end deletion and restart recovery; production deletion needs
specific authorization.

### Product improvements after foundational gates

Prioritize the Garmin/COROS MVP release criteria. Coach/team expansion and advanced
model-comparison UI remain deferred. Choose the next explicitly approved item
by athlete payoff, not speculative refactoring:
1. Onboarding ends with verified data or a clear upload action.
2. Missing-stream panels offer recording upload; provider status is honest.
3. One clear daily decision and primary metric; compare-model detail stays accessible.
4. Autosaved manual-entry drafts, mobile/split-screen navigation, focused error actions.
5. Accessible modals, contrast, reduced motion, then command/navigation surface.
6. Weekly coaching review with visible rationale and accept/reject.
7. Branding: TrainPaceLab only; stress-response imagery, small-size vector mark,
   complete favicon/PWA assets and real product screenshots.
8. Coach workspace depth, clear pricing, transparent export/deletion copy.

These items do not authorize unattended feature work before the foundation gates.

## Visual quality and brand asset workstream

This supports the core athlete journey and does not delay eligible data-fidelity
repairs. Avoid broad visual redesigns while foundational defects remain open.

| Item | Acceptance evidence |
| --- | --- |
| TPL-BRAND-001: inventory and identity | Audit current logos, wordmarks, favicons/PWA icons, screenshots, illustrations, remote photos and duplicate/unused assets. Use TrainPaceLab consistently. Record source/licence, purpose, placement and keep/rework/remove decision; do not remove unique assets blindly. |
| TPL-BRAND-002: logo and essential assets | Produce a coherent original vector mark/wordmark, mono/light/dark variants and the required favicon/app/PWA sizes. Verify small-size legibility, backgrounds, touch/header placement and no clipping on iPad/split-screen. Confirm actual manifests/icon references and loading. |
| TPL-BRAND-003: image quality gate | Use relevant high-quality imagery or clearly illustrative training stress/response graphics only where they improve comprehension. Assess each asset in the actual page; reject generic, misleading, cluttered, illegible or poor-quality results. Prefer no image over a weak one. Synthetic/illustrative charts must never impersonate measured athlete evidence. |
| TPL-BRAND-004: optimized delivery and verification | Supply appropriately sized responsive assets, modern formats where suitable, explicit dimensions, sensible loading priority and caching. Verify payload/layout-shift impact, image failures, alt text or decorative treatment, contrast, reduced motion, and light/dark behavior on desktop/iPad/narrow layouts. Use a measured before/after budget rather than claiming performance improvement from compression alone. |

Deliver one small asset set or surface per change, with actual screenshots and
keep/rework/remove decisions. Retain licensing/provenance and editable originals
outside public health-data evidence. Real product screenshots use synthetic or
properly consented data; never include account/session details. No image or logo
is approved solely because a generator produced it.

## Recurring work loop

Suggested cadence: every two hours. One local coding runner plus one read-only
GitHub oversight task. Never allow two writers on the same branch.

At each coding run:
1. Read this roadmap, repository AGENTS.md, current task status, fresh GitHub state
   and any newer user directions. Do not assume previous scratch files exist.
2. Verify branch, clean isolated worktree, target environment and required access.
3. Acquire a host-local exclusive lock before editing. If another writer is active,
   stop without modifying anything. Release the lock on completion/failure.
4. Select ONE highest-priority unblocked acceptance item from the current gate.
   If prerequisites fail, report the precise blocker and stop; do not jump gates.
5. Reproduce the issue, implement the smallest complete fix and appropriate
   regression test. Keep changes scoped; no cosmetic churn or dependency upgrades.
6. Run relevant checks, then required CI/runtime checks. Review the diff for data
   leaks, auth bypasses, fake metrics, behavior regressions and unrelated edits.
7. Save useful work on a dedicated branch before the run ends. Update an existing
   matching PR rather than creating duplicates. Verified fixes may merge through
   the protected process once checks/reviews/acceptance pass; no production publish.
8. Record evidence and the next action. If incomplete, preserve the checkpoint
   and explicitly label it incomplete; never claim failed checks pass.
9. Notify on a completed deliverable, new failure, required decision or newly
   cleared blocker. Avoid repeating unchanged blockers. No open-ended self-work.

Run budget: one bounded task, normally at most 45 minutes; stop earlier for
approval/auth/network blockers or unavailable integration tests. Do not start
another item just to fill the budget. Never circumvent usage limits.

A coding task is DONE only with a reproducible result, meaningful checks, exact
commit/PR evidence and disclosed limitations. "Improved" requires a named behavior
or acceptance improvement, not an unsupported quality claim.

## Durable task record

Use one record per accepted work item:
- ID, gate, acceptance criterion, owner and status.
- Status: queued / active / blocked / review / verified / done.
- Branch, exact commit SHA, PR URL and dependency links.
- Checks and staging evidence, source of evidence, limitations.
- Last meaningful change, blocker and single next action.

Keep private environment evidence outside Git. Avoid a shared status-file write
race: the local coding runner owns task records; the web reviewer only reports.
Use append-only per-run records or the project's existing task system if present.
Do not rewrite old evidence to match a new outcome.

## Local coding automation prompt

Configure in a desktop scheduled task attached to the TrainPaceLab repository,
using an isolated worktree and the authenticated local environment:

"Work on TrainPaceLab in cjmurphy73-44/runpacelabcurrent. Read
docs/DEVELOPMENT_ROADMAP.md from the reviewed roadmap branch if it is not yet
merged, plus AGENTS.md and newer user instructions. Execute the Recurring work
loop. Complete one eligible acceptance item, test it, preserve a reviewable
branch/PR checkpoint and report only meaningful changes. Gate 0 comes first:
do not attempt authorization/billing/telemetry/coaching changes until pipeline
PRs 1 and 2 are BOTH merged and verified. Never modify or publish production,
bypass protection, touch unrelated odysseus changes, expose secrets,
or claim local/simulated tests establish remote staging/provider behavior.
Merge only verified fixes through the protected PR process with required reviews.
If another writer owns the branch or a required prerequisite is unavailable,
stop and report the precise blocker once. Do not repeatedly retry it."

The local runner is NOT configured merely by saving this prompt. A web scheduled
task does not control the Mac's CLI session. Attach the local task explicitly,
test one manual run, inspect its target directory/worktree and first results,
and keep the machine and desktop application running as required by the product.

## Web oversight automation contract

Read GitHub state, current roadmap and existing PR evidence. Check the current
gate, exact-head CI, review/merge changes and newly supplied staging evidence.
Perform read-only review of meaningful new diffs and identify regressions.
Do not impersonate an independent reviewer, approve your own PRs, edit the local
Mac, mutate a coding branch, send comments to others or assert deployment access.
Report completed work with links, next eligible item and only changed blockers.
Absence of new evidence is not evidence of completion. Re-check gates after merges.

## Future milestone: launch independently of Base44

Status: discovery only, after foundational gates and explicit Product Owner approval.
Do not start a rewrite or change production hosting during stabilization.

Vercel frontend deployment is a hosting milestone. It does not replace Base44's
authentication, entity storage/RLS, service-role functions, private assets,
OAuth token storage, scheduled jobs, agents, emails or webhook processing.

1. Inventory real Base44 dependencies and export paths. Trace src/services/
   contracts/adapters and remaining direct SDK calls. Preserve the pure science
   engine and deterministic fixtures.
2. Define a backend-independent interface for identity, entities, functions,
   assets and background jobs. Introduce adapters incrementally rather than
   changing working product behavior merely to prepare for migration.
3. Prototype one complete synthetic-athlete journey on an isolated alternative
   backend. Evaluate operations, security, cost and maintenance before selecting
   a provider. Vercel can host the React frontend; backend choices remain open.
4. Reproduce ownership/consent enforcement, Stripe idempotency, OAuth secrets,
   full-file storage, ingestion retries, exports and resumable deletion.
5. Validate migration fixtures, data mapping, parity, volume/performance and
   privacy controls. Use explicit cutover/rollback plans and a user-approved
   production migration window. Do not mirror real health data automatically.
6. Done only when end-to-end journeys work without Base44 runtime calls and
   reviewed export/cutover/recovery evidence exists. A deployed frontend alone
   is not an independent launch.

Deliver visible athlete improvements through the current roadmap while this
remains a later option, not a prerequisite for shipping the stabilized app.
