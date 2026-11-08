# Small delivery queue

Direct Product Owner request: break SaaS guidance into small, testable work and
execute it. This is not a conversion of competitive research into engineering
scope. Status reviewed 8 November 2026. Repository PR numbers differ from the
seven pipeline work packages.

| Task | Observable acceptance | Status / gate |
| --- | --- | --- |
| UX-001: conversation review | No inferred running lock; owner can acknowledge displayed sources; all views refresh; failed save is honest. | Implemented in GitHub #7; local/CI evidence recorded, staging still required. |
| UX-002: plan error recovery | Actual session renders, failed loads are not rest days, retries work, AI failure releases busy state, both views refresh. | Implemented in #7; eight regression cases, staging still required. |
| UX-003: export recovery and format honesty | Calendar/Activity Detail share pending/error/retry behavior, overlapping exports during preparation are guarded, JSON is labelled honestly, browser resources are released. | Implemented locally; 209 tests/32 files and required checks pass. PR/staging review required before main. |
| UX-004: connection outcomes | Distinguish connected, expired, syncing, retryable failure and no provider data with one primary action. | Queued; inspect current UI first. Backend/provider changes remain behind pipeline gates. |
| UX-005: upload outcome clarity | Show processing/pending, complete stream, confirmed summary-only and failed parse separately; preserve file context on retry. | Queued behind staging and ingestion gates; no new parser/telemetry work yet. |
| UX-006: provenance and freshness | Existing verified metrics explain source/time/completeness without new scores or fabricated measurements. | Queued; consumes approved science output. No formula changes before science gate. |

Each task gets one bounded implementation, meaningful regression checks, exact
commit/PR and honest runtime limits. A source/unit pass is not a production
release. Current user permission allows isolated usability implementation;
main/production remain subject to staging and independent review. No broad
authorization, billing or ingestion work is unlocked by this queue.

Measure athlete outcomes: successful action, understandable failure and recovery,
consistent saved state. Do not count code churn or passing mock tests as user value.
The local coding schedule is not activated merely by recording these tasks.

UX-003 limitation: the browser download API does not confirm that a file was saved.
The lock prevents overlapping preparation; it is not a physical double-tap debounce.
No direct watch-import compatibility or browser-runtime verification is claimed.
