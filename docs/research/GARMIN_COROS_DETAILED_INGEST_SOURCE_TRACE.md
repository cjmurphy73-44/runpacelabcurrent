# Garmin vs COROS detailed-recording ingestion: source trace and acceptance plan

Date: 9 November 2026. **Scope:** one bounded source-only G3 preparation task; not G3 acceptance. No credentials, athlete records, staging writes, provider requests or application changes. Existing canonical task IDs: TPL-INT-001-GAR / TPL-INT-001-COR (capability matrix), TPL-INT-002-GAR / TPL-INT-002-COR (native recording), TPL-G0-008 (synthetic FIT to dashboard). These remain blocked by prerequisite gates.

## Evidence categories

- **Source confirmed** means a checked-in branch contains a code path; it does **not** prove it is deployed, authorized, reachable, or populated with athlete data.
- **Provider capability** requires current official access-tier documentation and granted scopes, not inferred API availability.
- **Runtime accepted** requires a consented or synthetic source recording, authorized staging trace, persisted sample counts, reload and display parity. No such acceptance evidence was obtained in this task.

## Concrete source trace

| Surface | What the reviewed source does | Implication / unknown |
| --- | --- | --- |
| COROS `base44/shared/corosMcp.ts` | MCP client has `queryCorosRecords` and `downloadCorosFit`; FIT download is keyed by record label ID and sport type. `downloadCorosFit` may return null for unavailable/undecodable recording. | Detailed recording path is **implemented in source**; real access, API quotas and returned channels are unverified. |
| COROS `base44/functions/corosSync/entry.ts` | Polling sync calls `downloadCorosFit` around line 561 and applies FIT telemetry; `applyFitTelemetry` stores `storageStream(fit.stream.slice(0,MAX_STREAM_SAMPLES))` and up to 200 laps around lines 435–436. | Recording data can be retained, but truncation at MAX_STREAM_SAMPLES and lap cap must be disclosed/tested; no proof of lossless full-file retention. |
| COROS webhook/URL path `corosSync/entry.ts` | If a safe FIT URL exists, parses FIT, requires usable telemetry, writes `streams` and `laps`; otherwise summary fallback. | Summary-only may be legitimate; fallback must not be represented as full telemetry. |
| Garmin `base44/functions/garminSync/entry.ts` | Historical sync requests `/activities` and builds activity summaries, `source_format: 'webhook'`, and `laps: []` for zone estimation. Also fetches `/dailies` for recovery summaries. | **This inspected historical path is summary-oriented**; no demonstrated native FIT download or persisted per-sample stream in this function. Other Garmin ingestion routes may exist and must be traced separately. |
| Generic upload `base44/shared/workoutIngest.ts` | FIT parser maps per-record measurements to `streams` in addition to a summary. | Manual/imported FIT can be richer than a provider's summary sync; this does not prove Garmin API stream delivery. |
| Garmin alternative paths | `src/services/telemetry/GarminAdapter.ts`, `GarminWebhookProcessor.ts`, `src/server/routes/garmin.ts`, `backend/routers/garmin.py` exist. | Source presence alone does not establish which route is deployed, used, authorized, or persists sample streams. Trace before concluding Garmin is summary-only across all paths. |

## Acceptance matrix: one native recording per provider

For each provider, capture only sanitized evidence: approved test account / synthetic recording, exact code version, activity ID represented by nonreversible test alias, consent/scope class, source type, API/recording format, start/end UTC, timezone, source bytes/hash (not uploaded to Git), record count, persisted count, field presence, lap count, reload count, UI count and any truncation. Compare heart rate, GPS, pace/speed, elevation, cadence, power, pauses, laps and missing channels **only where the device recorded them and provider exposes them**. Keep summary-only, failed download, partial stream, truncated stream and unsupported scope as distinct states.

Pass only when: (1) access is authorized and scoped to correct athlete; (2) no fabricated stream from averages; (3) timestamps, units and valid zeros survive; (4) source vs persisted sample/lap counts reconcile or documented truncation is explicitly visible; (5) dedup/retry and cross-account isolation hold; (6) dashboard/chart and reload show the same provenance and data; (7) recovery metrics (sleep, HRV, RHR) are separately verified and never inferred from workouts. A green CI build or MCP source implementation is not a pass.

## Recommended next bounded task and blockers

**Next source audit (eligible without provider secrets):** inspect Garmin's alternative webhook/adapter routes to locate any genuine FIT/stream persistence, then identify the exact runtime-dispatch path; one provider, one trace, no implementation. After G0 and G2, run TPL-INT-001-COR and TPL-INT-001-GAR with approved provider access, followed by one native-recording acceptance fixture per provider. G0-002 metadata-only staging isolation and original-Mac Odysseus preservation remain externally blocked; do not bypass them to perform live ingestion.

## Wider roadmap continuity

Maintain security/RLS and consent, Stripe entitlement checks, provider data quality, deterministic load math, coaching safety, account deletion (including derived streams and models), onboarding, mobile/iPad accessibility, logos/PWA imagery, QA and controlled release in the existing backlog. Detailed telemetry is a core product requirement, not a replacement for those tracks.
