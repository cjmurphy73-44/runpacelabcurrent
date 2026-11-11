## Hosted webhook acceptance attempt — 2026-11-12

A read-only, unauthenticated POST was sent to the staging app's `/api/functions/corosSync` endpoint with a deliberately nonexistent synthetic COROS user ID. **Actual hosted response: HTTP 503** with JSON `{"error":"External sync is disabled for this environment."}`. This is an environment-level gate; the request did not reach the intended webhook signature/ownership checks. No athlete or connection records were created and no FIT download was attempted.

**Blocker:** staged external sync must be enabled **only for isolated synthetic acceptance** after confirming staging's own provider/test-account isolation and external side effects. Do not turn off the environment guard globally, use production provider secrets, or claim hosted webhook success.

**Next executable test:** once a safe function invocation route is available, exercise invalid signature (401), unknown COROS account (400), and a synthetic connected athlete with an HTTPS-hosted test FIT file. Verify saved samples and provenance by entity readback, then delete all test records. The successful direct entity readback is a separate result and does not substitute for this.

## Staging implementation and persistence results — 2026-11-12

- Created Base44 staging pre-change checkpoint `6af4e47a016517b2d94e0216`.
- Updated the existing `base44/entities/WorkoutSession.jsonc` on staging to support native per-sample `power` and `recording_provenance`, preserving the other fields and RLS. Base44 live schema API confirmed both. Saved checkpoint `6af4e4c1008f7dad6a9e39e6`.
- Created isolated Base44 branch `coros-fit-staging-validation` and installed the reviewed COROS webhook handler, shared MCP download handler, bounded recording-storage helper and synthetic test fixtures from GitHub PR #20.
- Base44 branch test results: **16/16 COROS synthetic handler/contract tests passed; 176/176 existing app tests passed; TypeScript check passed; Vite build passed**. Saved branch checkpoint `6af4e59bf999fe1478e53a99`.
- Merged the Base44 staging branch into the **staging app only**, with no merge conflicts. The Base44 GitHub PRs remain draft and unmerged.
- Set a **new staging-only** `COROS_WEBHOOK_SECRET`; no production secret copied. This secret is write-only in Base44.
- Created one temporary synthetic cycling `WorkoutSession` directly through the staging Base44 entity API. A subsequent **hosted Base44 readback** verified all 3 samples, valid native 0 W power, nonzero power, 1 lap, SHA-256 provenance field, and stored sample count (**6/6 checks passed**).
- Deleted the synthetic session through the entity API and verified its ID is no longer retrievable.
- No production app or real athlete records were modified.

**Scope limit:** The hosted readback proves entity storage/schema persistence, **not** the end-to-end FIT URL download → authenticated webhook → FIT parse → persisted recording path. The latter remains an explicit staging acceptance requirement. No original FIT binary archival has been implemented. Do not claim full hosted webhook acceptance until that path is exercised with a test-only connected athlete and a safely hosted synthetic FIT.

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
