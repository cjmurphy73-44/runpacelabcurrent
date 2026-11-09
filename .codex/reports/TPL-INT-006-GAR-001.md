# TPL-INT-006-GAR-001: executable Garmin sample-boundary characterization

9 November 2026. Existing owning PR #9, fix/provider-connection-feedback.
Source parent: a6f5a155c751267fec1125d10cea23d6ccfe01ba.
Status: implemented offline tests; runtime retention defect remains open.

## Authority and bounded change

The Product Owner explicitly authorized safe isolated implementation/automated
tests while staging isolation is being resolved. This run takes one child of
TPL-INT-006-GAR: the Garmin webhook sample-count boundary. It does not open a
second feature branch, duplicate the source audits or implement a telemetry fix.
COROS fidelity is a separate next scenario, not bundled into this test task.
No production release, security/billing change or real-provider pilot is authorized.

## Changed files and measurable outcome

- scripts/__tests__/fixtures/syntheticFit.mjs: deterministic record-only FIT
  binary fixture with 1 Hz timestamps, HR, altitude, distance, cadence, speed and
  power, header/file CRCs and no athlete/GPS/account information. This is not a
  device-export conformance test; the app's actual native decoder reads the bytes.
- scripts/__tests__/garmin-webhook-stream-boundary.test.mjs: bundles and executes
  the real garminWebhook entry/import graph, URL validation, native FIT decoder,
  stream mapping and HR-zone calculation. Only SDK/runtime packages, network and
  downstream CTL/coach side effects are explicit isolated fixtures.
- docs/AUTONOMOUS_DELIVERY.md: records the newer active-implementation authority
  without weakening review/release/security/billing/Odysseus safeguards.
- docs/DELIVERY_STATUS.md and this report: exact scenario, evidence and limits.

Before: the boundary was described by research, without a runnable handler-level
3599/3600/3601 test on the owning provider branch. After: CI executes the actual
parse-to-serialized-SDK-payload path and explicitly records the unresolved defect.

| Synthetic records | Decoded samples | Samples in serialized workout | Result |
| --- | --- | --- | --- |
| 3599 | 3599 | 3599 | Every currently mapped sample/value retained |
| 3600 | 3600 | 3600 | Every currently mapped sample/value retained |
| 3601 | 3601 | streams omitted entirely | Handler still returns success and stores stream-derived zones |

Samples are not duration: 3601 points at t=0..3600 cover 3600 seconds. The test
also checks valid zero distance/altitude, native units and terminal timestamp,
HR/cadence/speed/power decoder values. Power is decoded but excluded by the
existing handler storage mapping; the shorter cases do not certify full native
channel fidelity. The omission case demonstrates loss in the serialized create
payload, not a measured hosted database or dashboard outcome.

## Tests and controls

Command: npx vitest run scripts/__tests__/garmin-webhook-stream-boundary.test.mjs
Result: 3 passed, 1 expected failure. The expected failure is clearly named
KNOWN DEFECT and asserts desired full recording retention. The ordinary test is
also executed in a temporary probe with the .fails marker removed: it fails
because the serialized streams value is undefined. The probe is removed and
never committed. The passing characterization does not accept omission as the
product contract. A real retention fix must update the omission characterization
and remove the expected-failure marker; do not suppress or delete the evidence.

Required local checks passed: typecheck, lint, production build and backend
validation (49 entry graphs, 28 resources). Full suite: 263 passed, 1 explicitly
expected failure, 43 files. Existing three catalog RLS warnings, large bundle and
npm configuration warnings remain. ESLint's configured scope does not lint these
script files; Vitest executes them, and node --check verifies their syntax.
An exact-head GitHub clean-install result is separate from these local checks.

The VM never receives process.env or a real SDK credential. fetch is replaced
with a single-destination synthetic Response; unexpected destinations throw.
SDK writes are JSON-serialized in memory. Post-ingest CTL and coach work are
explicit stubs, not claimed calculation/provider/LLM acceptance. Synthetic env
flags exist only inside that VM; no staging flag was changed to production.

## Staging and path to live

No Base44 preview/staging/production deployment occurred: this run changes tests
and process records only. Existing frontend/backend manifests and access remedies
are recorded in PR #6's DEVELOPMENT_TO_PRODUCTION.md and G0-002 metadata report.
The latest source/publish mismatch must be resolved per component, not inferred
from one app site SHA. No runtime fix or visible athlete change is claimed here.

G0 remains partial. Supported connection counts respect owner RLS; zero visible
records do not prove global emptiness. Required action: a supported Base44
administrator/platform count-only isolation attestation across owners, without
reading token rows or weakening RLS, and confirmation that the existing staging
webhook secret was generated specifically for staging. The owner was asked only
for provenance, never the value. No new app-wide read grant is available here;
do not retry the unchanged scoped count and call it stronger evidence.

A future runtime fix must establish supported full-stream storage/retrieval,
retain native fields/provenance, and pass the now-executable boundary cases. Then
required security/review checks, isolated hosted FIT-to-dashboard/reload evidence,
exact frontend/backend deployment manifests, verified rollback and separate
production approval are still required. Live domain/GitHub API network access and
original-Mac Odysseus preservation also remain prerequisites for their release
steps. A test-only commit itself needs no production deployment to provide value.

Odysseus source, files, gitlink and launch scripts were not modified. The branch
already inherits a gitlink removal; no merge of that history is performed or
approved by this run. Tests, fixtures and docs contain no private app IDs,
credentials or athlete data. Whitespace, syntax, links and private-value exclusion
are checked before commit.

## Next atomic development task

Implement a separate synthetic COROS recording round-trip/cap characterization
through its real ingest path, with explicit parser/SDK/provider boundaries and
native-channel/sample comparisons. Reuse the existing owning PR and keep the
full-recording runtime repair separately scoped; do not claim real-provider health.
