# COROS FIT staging acceptance gate (2026-11-12)

## Read-only findings from isolated Base44 app

Staging app ID: `6aefe9d09e2788fc8591c758` (not production).
Its current sandbox commit was `c1eca98 Update base44 packages`.
The deployed workspace did **not** contain `base44/shared/recordingStorage.ts` or `scripts/__tests__/coros-webhook-fit-integration.test.mjs`.
The deployed `base44/functions/corosSync/entry.ts` was an older implementation.

The live staging `WorkoutSession` schema (read through the Base44 schema API) currently:
- Defines `streams[]` samples with `time`, `heart_rate`, `altitude`, `distance`, `cadence`, `speed`, **but not `power`**.
- Defines `laps[]` and `zone_method`.
- Does **not** define `recording_provenance`.

Thus **the staging schema is incompatible with the intended PR #20 full-fidelity write contract**. A READY Vercel frontend does not deploy Base44 backend functions or entity schemas.

## Staging isolation checks performed (read-only)

The staging Base44 secrets API currently lists **only** `TPL_ENVIRONMENT` and `WEBHOOK_SYNC_SECRET` (names only; values cannot be inspected). In particular, `COROS_WEBHOOK_SECRET` is **not set**. The new COROS webhook correctly returns 503 without that secret, so an authenticated synthetic webhook test cannot yet run. Do not copy a production secret to staging.

The staging app has **no active Base44 branches**. Its sandbox source is older than the GitHub PR #10/#20 stack. Vercel preview builds are separate from Base44 backend deployment. These checks did not modify the staging app.

**Safe deployment decision:** do not overwrite staging's main backend with the GitHub branch while the codebase differs and isolation is incomplete. Create a separate staging-only branch/checkpoint, review the full GitHub diff and required schema migration, and provision a unique test webhook secret before invoking anything. Confirm that downstream `calculateDailyTRIMP` and `runPostWorkoutEvaluation` cannot trigger real external calls or expose data.

## Exact schema migration required

Extend the existing `WorkoutSession` entity JSON Schema without replacing unrelated fields or RLS:

```json
{
  "properties": {
    "streams": {
      "items": {
        "properties": {
          "power": {
            "type": ["number", "null"],
            "description": "Native per-sample cycling/running power in watts; zero is a valid measured value"
          }
        }
      }
    },
    "recording_provenance": {
      "type": "object",
      "properties": {
        "source": { "type": "string" },
        "retention": { "type": "string" },
        "source_sha256": { "type": "string" },
        "source_bytes": { "type": "integer" },
        "original_file_retained": { "type": "boolean" },
        "decoded_samples": { "type": "integer" },
        "stored_samples": { "type": "integer" },
        "decoded_laps": { "type": "integer" },
        "stored_laps": { "type": "integer" },
        "first_time_s": { "type": ["number", "null"] },
        "last_time_s": { "type": ["number", "null"] },
        "channels": { "type": "array", "items": { "type": "string" } },
        "inline_limit_bytes": { "type": "integer" }
      }
    }
  }
}
```

This is a **patch specification**, not a complete replacement entity schema. Validate nullable-field syntax with Base44 before applying, and use a backup of the full existing schema for rollback.

## Required before any hosted write

1. Establish that staging secrets, provider callbacks, external integrations, billing and test accounts are isolated. Do not use real athlete data or trigger provider syncs until confirmed.
2. Review and safely apply the approved GitHub ingestion dependency stack (PR #10, then PR #20) to the **staging Base44 app only**. Do not overwrite unrelated staging changes.
3. Update the staging `WorkoutSession` schema to explicitly support per-sample `power` and `recording_provenance` fields; verify any platform limits and field validation. Review RLS.
4. Create a dedicated synthetic test athlete and synthetic linked COROS connection **only after isolation is confirmed**. Use test-only webhook credentials.
5. Invoke the staged webhook with synthetic FIT of 180, 3,601, and 7,201 samples. Read back records and compare count, first/last timestamps, channels including zero watts, laps, SHA-256 provenance and byte budget. Verify no silent summary fallback, rejection on over-budget FIT, retries and deduplication.
6. Remove synthetic records, audit external side effects and record test evidence; never promote until all checks pass.

## Evidence already verified

On the PR #20 development branch, Vercel executed 13 offline bundled-handler synthetic FIT integration tests plus 3 source-contract tests: **16/16 passed**, followed by a successful Vite build. This is not hosted Base44 persistence verification.

## Release status

**Blocked: staging backend and schema are not yet aligned.** No staging athlete records were created, no hosted webhook was invoked, and production was not modified.
