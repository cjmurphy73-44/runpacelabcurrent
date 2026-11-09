# App experience audit checkpoint

8 November 2026. Local review based on existing PR #9 head
`84ddd709711244be3a174c455f810fc3cad1c8d5` plus the changes in this branch.
This file is the durable public summary. Private environment/session evidence
and detailed security reproductions remain outside Git.

## Implemented fixes

- Authenticated root entry goes directly to the app; SDK sessions survive reload.
- A visible day/night control persists its setting on this browser.
- Non-coach plans do not show Roster navigation. Existing admin access is
  preserved, but does not insert coach navigation into the athlete experience.
- Disallowed/loading coach pages do not fetch roster data before access resolves.
- Wearable selection, provider availability and successful sync are distinguished.
- User Guide data matches its renderer and unknown provider states render safely.
- Onboarding requires an explicit final confirmation before creating a profile.
- Duplicate floating feedback UI and narrow Workouts/Imports overflow are removed.

## Verification

Typecheck, lint, build and backend validation passed locally. The unit suite
passed 246 tests in 40 files. Offline backend validation covered 49 entry graphs
and 28 resources; three catalog RLS warnings remain. Platform runtime APIs are
external to that validation.

Chromium loaded all 31 registered route paths at desktop, iPad and narrow-screen
sizes (93 checks) with synthetic HTTP fixtures and external requests blocked.
Final runs showed no uncaught page exceptions or page-level horizontal overflow
in those scenarios. Role/theme checks, signed-out routing, direct roster gating,
novice onboarding, final confirmation and reload were exercised separately.
These are frontend checks, not evidence of real provider or billing operations.

The Product Owner manually confirmed that the existing staging app accepted
sign-in/onboarding and reached the dashboard. That tested the previously deployed
staging version. Subsequently, frontend source 2244ffba51abbcd1c8b701d914cbf14089e2c79f
was built explicitly for staging and published on 8 November at 08:49 UTC.
All 36 changed frontend editor files were saved and read back matching Git.
Backend source, private visibility and inactive workflows were preserved.
The anonymous login page loaded without browser errors; an authenticated hosted
athlete dashboard/FIT journey on this candidate remains unverified.

## Open findings

- Race-result onboarding remains blocked by incompatible caller/science-module
  contracts. The novice/mileage path passes. Do not replace the missing race
  calculation with a fabricated default estimate to make the flow pass.
- Authorization, URL-fetch safety, billing concurrency/mode isolation, data
  fidelity and resumable deletion require their roadmap acceptance work.
- Offline queue overwriting of concurrent enqueues and simulated successes for
  unregistered actions are repaired in the follow-up below. Auxiliary
  Python/scientific scaffolding remains unresolved.
- Supported-file promises differ across uploaders and need real file fixtures.
- Provider OAuth, AI generation, billing, deletion, cross-athlete permissions and
  populated longitudinal dashboards have not received remote acceptance here.

A green fixture test is not a completed MVP gate. Review and staging acceptance
must track the exact source being released, with private identifiers omitted.

## 9 November: offline queue follow-up

A save in flight no longer empties the live queue or replaces concurrent
enqueues when its batch completes. Persisted state retains pending requests
until their handlers finish, and successful items are removed incrementally.
Unregistered actions remain queued instead of using simulated network success.
Clearing the queue cancels waiting work without reintroducing an in-flight
failure. Newly queued work is drained after the active batch; existing retry
backoff is preserved. Offline enqueue status updates immediately, and online
waiting work is labelled Pending sync rather than incorrectly shown as syncing.

Six regression cases cover concurrent pending saves, persistence, failure,
clearing, missing handlers, status notification and retry backoff. The complete
suite passes 252 tests in 41 files, alongside typecheck, lint and backend
validation. Local iPad-sized Chromium exercised the actual service and status
components with synthetic queue data: offline queued count and online pending
state rendered correctly, local storage retained the item through reload, and no page exception
occurred. Vite development HMR websocket errors occurred in the harness and
are not a hosted-runtime pass. This does not verify remote athlete data writes.

The queue remains at-least-once: a browser interruption after server success but
before local removal can repeat an operation. Handler idempotency, account-scoped
storage, retry scheduling and exhausted-retry recovery require separate review;
this change does not establish those guarantees.

The follow-up was also published to the existing private staging app from
a2dd36020d573faa737695c5656ddc7034fa896f. Both changed frontend files read
back matching Git; backend source and workflow records were unchanged. This
establishes staging publication and source parity, not a hosted authenticated
queue or athlete acceptance pass.

## 9 November: exhausted offline saves remain recoverable

The sixth failed attempt previously removed the unsaved payload from memory and
local storage, logged the entire item and left the status badge showing Online.
The new regression suite reproduces that data loss against c95b2b5: three new
cases fail there and all nine queue cases pass with this repair.

Exhausted work now stays persisted and counted as unsaved. Ordinary processing,
including reconnect, skips it until an explicit Retry failed changes action
starts another bounded attempt cycle. That action does nothing offline or while
a save is active, and preserves backoff for other pending work. The badge shows
the failure count and total unsaved changes; exhaustion no longer logs payloads.

Evidence is local: 255 tests in 41 files, including actual React status/retry
components with synthetic handlers and browser-storage fixtures. Typecheck,
lint, build and backend validation are required for this candidate. No hosted
save, deployment, account isolation or exactly-once delivery is established.
At-least-once handling, automatic retry scheduling and account-scoped storage
remain separate acceptance work. This repair cannot restore items already
dropped by older code.

## Garmin retention implementation (TPL-INT-006-GAR-002)

The webhook no longer silently omits recordings above 3,600 samples. Complete
decoded streams/laps are retained within byte budgets; oversized, invalid or
unavailable supplied files return explicit errors rather than summary success.
Native power and provenance are stored. Raw binary archival remains absent.
Full local suite: 297 passed, four known COROS expected failures. No hosted
deployment or provider acceptance. See .codex/reports/TPL-INT-006-GAR-002.md.

## Coach guidance recovery and keyboard access

Management now offers Refresh guidance after a failed/stale save; successful
refresh clears stale selection and save errors. Failed refresh keeps selection
visible, labels cached guidance and disables clearing until a successful read.
Escape and Keep restore focus to Manage guidance without writing. Full suite:
300 passed, four existing COROS expected failures. Real local browser fixtures
verify keyboard, reload, preserved workout and iPad/mobile layout.

## Coach chat recovery implementation

Failed conversation load now offers retry/dashboard navigation; failed sends
retain the draft and restore focus instead of discarding text. Accessible named
input/send and overlapping-submit guard added. Four regressions and real local
Chromium iPad/phone fixtures pass; full suite 304 passed/four known COROS expected
failures, plus typecheck/lint/build/backend validation. Screenshots under
`docs/evidence/coach-chat`; task `.codex/reports/TPL-UX-COACH-CHAT-RECOVERY.md`.
No hosted publication: staging Google callback domain error remains unverified
and parked per owner. Production and existing backend unchanged.

## TPL-INT-006-COR-002: historical COROS recording retention

Historical MCP sync now preserves complete supported decoded streams, native
power and laps within the shared explicit byte budgets; no 3,600-sample prefix
or 200-lap truncation in this path. Provenance states counts/hash/source and no
original archival. Oversize is reported/skipped with no partial workout; valid
siblings import and bulk writes split by bytes. COR-003/004 historical power/lap
assertions now pass normally; other entry/processor mappings remain unverified.
Full local suite: 312 passed/one known COR-005 expected failure, 46 files;
typecheck/lint/build/backend validation pass. No deployment. See task report
`.codex/reports/TPL-INT-006-COR-002.md`; next code item is explicit failed-file
outcomes. Staging Google sign-in remains blocked/parked, not certified.
