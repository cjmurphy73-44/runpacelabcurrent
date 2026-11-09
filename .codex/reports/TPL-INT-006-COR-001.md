# TPL-INT-006-COR-001: synthetic COROS historical recording fidelity

9 November 2026. Existing owning PR #9, fix/provider-connection-feedback.
Parent: f9b36c94b8c3d7594b72cad3f693b2bb4ea64461.
Status: automated characterization implemented; exposed runtime defects are open.
One provider and one path: sync_historical, MCP discovery/download, FIT decode,
normalization and serialized bulkCreate. No live COROS or Base44 request occurs.

## Changed files and executed boundaries

- scripts/__tests__/coros-recording-fidelity.test.mjs adds executable integration
  fixtures around the real corosSync entry/import graph, MCP handshake/tool calls,
  download URL extraction, safe URL validation, binary decoder, summary/zone
  calculations, duplicate checks and storage mapping.
- scripts/__tests__/fixtures/syntheticFit.mjs extends the shared deterministic
  fixture with missing HR/power, a genuine zero power sample, timestamp gaps and
  lap messages. Existing Garmin fixture defaults and regression cases still pass.
- docs/DELIVERY_STATUS.md and this report track outcomes; the canonical backlog
  on PR #6 records implementation children and prioritizes the Garmin fix next.

SDK auth/entities, MCP JSON-RPC responses, file fetch and daily-TRIMP invocation
are explicit in-memory fixtures. The test checks MCP authorization/session headers
using synthetic strings; no process environment, real token or athlete data enters
that VM. Unexpected destinations/RPC calls fail assertions. Serializing SDK writes
and reading them back exercises the persistence boundary, not hosted database RLS,
backend size limits, actual browser reload or provider availability.

## Results

| Scenario | Actual observed outcome |
| --- | --- |
| 3599 / 3600 native samples | Every currently mapped sample is serialized; timestamps, HR, distance, speed, cadence, altitude and native zeros agree; laps retain values and final duration |
| 3601 native samples | Only the first 3600 survive, while duration/zones use all 3600 elapsed seconds |
| Two hours, 7201 samples | Only first 3600 survive; full 7200-second duration, zone totals and 120 laps remain, exposing incompatible persisted coverage |
| Timestamp gap | 180 points remain 180; gap from t=59 to t=75 and final t=194 survive without fabricated intermediate samples |
| HR available, no power | HR stream remains, missing power stays missing, no avg_power is fabricated |
| Power only, first power zero | Decoder retains zero and power; storage drops per-sample power, making the saved stream fail the same usable-telemetry rule despite accepted input |
| HR and power both absent | File telemetry is rejected by the current usability rule; summary import has no physiological stream or fabricated zone distribution. Other measured file channels are not retained by that fallback |
| 201 measured laps | Only first 200 stored; 202 underlying samples survive |
| No FIT URL | Summary-only import, no measured zones |
| HTTP 503 / malformed FIT | Also becomes summary-only with errors=0; failure is not distinguished in the response from no recording being available |
| Repeated identical activity | Sequential second sync writes nothing and does not re-download FIT |
| Duplicate rows in one report | One serialized workout, one duplicate counted |

The duplicate fixtures use matching summaries and controlled sequential requests;
they do not prove stable-provider-ID identity, concurrency safety, changed-summary
reconciliation or cross-provider idempotency. Sensors absent from the fixture,
GPS/position, absolute timezone semantics and compressed-timestamp FIT variants
are not certified. Laps are parsed from actual binary lap messages. Record-only
FIT fixtures with CRCs are not independent Garmin/COROS device conformance tests.
Code-level 3600/200 caps are exercised; actual Base44 byte/document limits are not.

## Tests

Targeted COROS suite: 14 passed, 4 explicit expected failures. Together with Garmin:
17 passed, 5 expected failures. All four new desired contracts were independently
rerun with .fails removed in a temporary, uncommitted probe; all four ordinary
assertions fail on current code. Passing characterization does not accept loss as
correct. Runtime fixes must remove the corresponding expected-failure markers
and update the old-behavior assertions; never suppress or discard the evidence.

Full suite: 277 passed, 5 expected failures, 44 files. Typecheck, lint, build and
backend validation pass (49 entry graphs/28 resources). Existing three catalog
RLS warnings, large-bundle and npm configuration warnings remain. Script syntax
passes node --check; current ESLint scope does not lint these script files.
Exact-commit GitHub CI is checked separately after push; a local pass is not a
hosted provider/ownership/data-retention acceptance pass.

## Implementation handoff and priority

Next task: **TPL-INT-006-GAR-002**, the Garmin retention repair requested by the
Product Owner. Replace silent omission with supported complete-recording storage
and explicit bounded failure/provenance, retaining native sample values and
counts. Use the existing 3599/3600/3601 assertions; do not merely increase the cap,
truncate, invent samples or leave an HTTP success after details disappear. Bound
storage by a justified supported contract. Over-limit recordings need a reviewed
retained-original/chunk/reference strategy or an explicit no-partial-write,
retryable outcome; never imply they were retained. Schema/RLS and hosting claims
still require their appropriate reviews and runtime evidence.

COROS implementation children queued under the same parent, after the Garmin fix:
- COR-002: complete long-stream retention with explicit limits and provenance.
- COR-003: preserve native channels, especially per-sample power and valid zero;
  schema/storage/readback must agree and missing physiology must remain honest.
- COR-004: preserve all measured laps or return an explicit supported-limit outcome.
- COR-005: distinguish unavailable recordings from failed download/parse and
  surface retry/error outcomes instead of error-free summary downgrade.

No runtime ingest, schema, credentials, workflows, staging or production data was
changed. No preview/staging/production deployment occurred. No Odysseus file,
gitlink, launcher or independent history was touched or merged. Full MVP roadmap
scope remains; this task does not turn research or synthetic evidence into a gate
pass. Visible application improvements require implementation and release, not
publication of this test suite alone.

## Remaining delivery blockers

G0 still needs an authorized app-wide metadata attestation accounting for owner
RLS and staging webhook-secret provenance (confirmation only, never its value).
No new app-wide count capability or provenance evidence arrived in this run;
no unchanged scoped count was retried or presented as stronger isolation proof.
Hosted synthetic athlete/FIT-to-dashboard acceptance, required independent review,
original-Mac Odysseus preservation, split frontend/backend deployment manifests,
verified rollback, live-domain/API network access and separate production approval
remain required at their release steps. None prevents the next safe offline
Garmin runtime patch; no production or staging bypass is authorized.
