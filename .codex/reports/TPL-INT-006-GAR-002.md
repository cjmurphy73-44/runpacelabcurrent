# Garmin complete decoded recording retention

Existing branch: `fix/provider-connection-feedback`, PR #9. Offline runtime fix;
no hosted deployment, athlete data or production change.

Previously, valid 3,601-sample FIT input returned success but omitted the entire
stored stream. The webhook now preserves all decoded samples/channels and laps
within explicit byte budgets. Real-handler/native-decoder tests compare complete
serialized payloads at 3,599/3,600/3,601/7,201 samples. Native power and measured
zero survive; missing HR does not fabricate zones. No science formula changes.

Input download budget: 8 MiB. Complete serialized workout budget: 1 MiB UTF-8.
These are application budgets, NOT verified Base44 hosted limits. Exceeding them
returns explicit 413, invalid FIT 422, download/network failures 502, with safe
messages and retryability. Failed supplied files no longer become successful
summary imports. Fixtures verify no workout/event/sync-time/coaching/load writes
on those outcomes. Legitimate summary-only notifications remain supported.

Provenance records original SHA-256/bytes, decoded/stored counts, channels and time
coverage. Original binary archival is NOT implemented: original_file_retained is
false. Complete means supported decoder output, not every native FIT message.
WorkoutSession adds optional provenance and power; existing RLS is unchanged.

## Verification

- Full suite: 297 passed, four existing COROS expected failures, 45 files.
- Targeted recording suites: 32 passed, four COROS expected failures.
- Typecheck, lint, build and backend validation pass (49 graphs/28 resources).
- Known warnings: three catalog schemas without explicit RLS; build chunk size;
  AuthContext test's localhost network failure is nonfatal.
- Six byte-budget cases cover exact bounds, UTF-8, actual chunk sizes despite
  understated headers, cancellation and reader cleanup. Initial deep byte-array
  assertion timed out; complete binary comparison removed test overhead.
- Diff inspection confirms no RLS/guard/Odysseus changes.

Persistence is a serialized in-memory SDK fixture, not hosted acceptance. Provider
retry health, concurrent deduplication, enrichment of existing summary workouts,
raw archival, and other historical/processor ingestion paths remain unverified.
No application or backend was deployed. Do not overwrite the staging guarded
entry with this branch: reconcile infrastructure guards in a reviewed candidate.

Release needs exact-head CI, independent review, original-Mac Odysseus preservation
before inherited gitlink-removal merge, G0/hosted synthetic storage readback,
separate frontend/backend manifests and rollback, then explicit production approval.
COROS recording-retention children remain queued; owner may prioritize coach UX.
