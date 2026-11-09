# Garmin detailed telemetry: alternative-route trace and long-recording risk

**Date:** 9 November 2026. **Task:** one bounded source-only follow-up to `GARMIN_COROS_DETAILED_INGEST_SOURCE_TRACE.md`; maps to preparation for TPL-INT-001-GAR and TPL-INT-002-GAR. Not G3 acceptance. No runtime, provider, staging, production, athlete-data, secret or Odysseus changes.

## Inspected routes and concrete conclusions

| File | Evidence from inspected branch | Interpretation |
| --- | --- | --- |
| `base44/functions/garminWebhook/entry.ts` | Lines ~60–79 check `fit_file_url`, validate URL, fetch, `parseFitWithLaps`, assign `fitStream` and `fitLaps`. Lines ~146–148 define `storedStream = fitStream.length > 0 && fitStream.length <= 3600 ? fitStream.map(...) : undefined`. Lines ~150–169 persist `streams: storedStream` and `laps`. | **Actual FIT stream persistence code exists** if the push includes an accepted file URL and <=3600 samples. If >3600 samples, the entire detailed stream is omitted rather than truncated; laps can still be stored. No proof that live Garmin pushes supply such URLs. |
| `base44/functions/garminSync/entry.ts` | Historical sync fetches `/activities`, constructs summary fields, uses `laps: []` for zone estimation and writes `source_format: 'webhook'`; `/dailies` separately supplies recovery summaries. | Historical backfill path inspected is **summary-oriented**; not equivalent to native FIT stream import. |
| `src/services/telemetry/GarminAdapter.ts` | `parsePayload` maps provided `samples` to heart rate, power, cadence and speed stream events; also maps HRV and sleep fields when present. | A normalizer exists for input samples; does not download native recordings or establish database persistence. |
| `src/services/telemetry/GarminWebhookProcessor.ts` | Calls `GarminAdapter.normalizeActivity`, but its returned `activity` contains only provider, distance and duration, omitting `normalizedActivity.dataStreams`. | **Lossy boundary:** even when the adapter parses samples, this processor's output discards them. Do not treat adapter capability as end-to-end ingestion. |
| `src/server/routes/garmin.ts`, `backend/routers/garmin.py` | OAuth/route scaffolding; no demonstrated FIT-to-WorkoutSession sample persistence in reviewed files. | Cannot establish deployed detailed recording path from these routes. |

## High-priority acceptance risks

1. **Long recording loss:** `garminWebhook` drops entire `streams` field above 3600 parsed points, with no explicit athlete-facing loss status in inspected write. The count threshold is points, not elapsed seconds. Acceptance fixture: 3599, 3600 and 3601 valid samples, plus 2+ hour activity with sparse sampling. Assert source count, persisted count and UI provenance; a summary-only fallback must be labelled, not presented as full stream.
2. **Summary-vs-FIT source ambiguity:** historical backfill writes `source_format: 'webhook'` without demonstrated native stream. Explicitly distinguish `summary_only`, `fit_stream_complete`, `fit_stream_unavailable`, `stream_omitted_limit`, and `parse_failure` in a future versioned contract.
3. **Alternative processor loses streams:** `GarminWebhookProcessor` returns summary only despite `GarminAdapter` producing `dataStreams`. Verify actual invocation/dispatch before changing code; unused modules must not be assumed deployed.
4. **Payload and authorization:** URL existence and format do not prove Garmin API scope, official webhook shape, correct user mapping, file provenance or cross-athlete isolation. Review the authenticated endpoint and SSRF safeguards before a live test.
5. **Missing fields and caps:** Garmin webhook stream mapping retains `time,heart_rate,altitude,distance,cadence,speed`; compare against source channels (e.g. power, position, pauses, lap metadata). Do not infer absent data as measured zero or derive GPS from averages.
6. **Idempotency uncertainty:** the webhook's `WebhookEvent.filter` error path explicitly comments `fail open`; duplicate detection then uses date/sport/duration/distance tolerance. A security/reliability review should inspect retry and race behavior under approved gates, not assume perfect idempotency.

## Reproducible source review procedure

Fetch the five named files at the exact reviewed branch SHA. Locate `fit_file_url`, `parseFitWithLaps`, `storedStream`, `WorkoutSession.create`, `GarminAdapter.parsePayload`, and `GarminWebhookProcessor.processActivityPayload`. Compare mapped fields and persistence boundaries. This is static evidence; no test fixture, CI run or live provider request was executed in this task.

## Proposed next atomic action

After G0 prerequisites and reviewer authorization, add a **test-only 3601-sample Garmin webhook characterization fixture** on the existing owning branch, without changing runtime behavior. The fixture should document current omission and separately define desired full-recording retention/explicit provenance acceptance. Do not ship a silent fix before G0 or exceed the approved task scope. Independently, test the COROS `MAX_STREAM_SAMPLES` truncation behavior. When access is authorized, verify Garmin and COROS provider capability and real returned fields separately.

## Wider roadmap continuity

Do not displace G0 staging isolation and Odysseus preservation; keep G1 ownership/RLS, G2 Stripe, G3 provider fidelity, G4 deterministic science/coaching, G5 deletion, athlete onboarding/mobile/iPad UX, asset/logo/PWA imagery, QA and controlled release on the canonical backlog. No production deployment, no credential inspection, no gitlink-removal merge.
