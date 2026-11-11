# COROS historical full decoded recording retention

Existing branch fix/provider-connection-feedback, existing PR #9. One atomic
storage-contract task; no provider calls, deployment or athlete-data changes.

## Behavior

Historical sync previously kept only the first 3,600 points, dropped native power
and capped laps at 200 while computing zones over the full decoded recording.
It now saves the complete supported decoded stream/laps when usable telemetry
exists. Full native power including zero and missing-channel nulls survive JSON
serialization. The related COR-003 power and COR-004 lap assertions for this
historical path are resolved in the same storage mapping; do not duplicate them.

Shared recording provenance now accepts coros_fit (Garmin default unchanged):
SHA-256/input bytes, decoded/stored counts, channels, first/last time and explicit
original_file_retained=false. No original binary archival was implemented.
Complete means supported native decoder output, not every possible FIT message.

The downloader bounds actual input to 8 MiB. Complete serialized bulk payloads
are bounded to 1 MiB, including array framing, with dynamic batching rather than
500 potentially large sessions per request. These are application budgets, NOT
verified Base44 limits. Input/decoded oversize skips that activity, increments
errors, returns recording_errors code/retryable metadata, retains connection
error feedback and does not write a partial session or recalculate its day.
Valid sibling activities still import. Existing UI already displays errors>0.
Response success describes a completed sync attempt, not error-free import.

## Evidence

- Synthetic real MCP transport, native decoder, historical handler and serialized
  SDK persistence: 3,599/3,600/3,601/7,201 samples, complete power/laps, timestamps,
  missing HR/power, source hash/counts and three normal former-defect regressions.
- New input/payload rejection, connection error, valid-sibling and byte-bounded
  bulk-write cases. Targeted recording suites: 40 passed, one expected failure.
- Full suite: 312 passed, one known expected failure, 46 files.
- Typecheck, lint, build and backend validation pass; 49 entry graphs/28 resources.
  Existing catalog RLS warnings and build chunk warning remain.
- Diff inspected; no entity policy/authentication/Odysseus change.

## Explicit limits and next work

COR-005 remains: unavailable/HTTP-failed/malformed FIT responses still fall back
to summary import without a detailed failure outcome. Its expected-failure test
remains visible. Nonphysiological files rejected by the existing usability gate
still do not retain their other measured channels; fix separately without
fabricating zones. The direct activity/webhook mapper and backfill processor
retain independent storage mappings/caps, so this does not certify every route.
The shared downloader bounds backfill input too; its caller still has its own
fallback behavior. Dedup remains heuristic/sequential, not concurrency-safe or
provider-ID based. Raw-file/chunk archival and hosted budget readback remain open.

No staging publication: Google callback domain failure is parked at owner request.
Release still requires reviewed infrastructure-guard reconciliation, exact-head
CI, independent review, original-Mac preservation before inherited Odysseus
removal merges, isolation/hosted acceptance, component manifests/rollback and
separate explicit production approval. No production modification was performed.

Next eligible atomic item: COR-005 explicit failed-file outcomes, distinguishing
missing files from download/parse failures without successful summary substitution.
