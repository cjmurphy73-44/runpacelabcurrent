# Verified daily load forecast: integration contract

Status: **engine-only, not authorised for live adaptive plan writes**. This implementation is a deterministic EWMA *scenario*, not a calibrated performance, readiness, or injury prediction.

## Required input provenance

- A caller MUST select one load metric for the entire history: `trimp` or `tss`. Never combine TRIMP and TSS, infer a fallback metric, or reinterpret one as the other.
- Each completed session MUST have a finite, nonnegative numeric value for the selected metric. A session missing the selected metric invalidates that date; a value of zero is only accepted when actually recorded.
- Every day in the historical window MUST have recorded load or independently confirmed rest. A successful Garmin/COROS/Strava sync, an empty API response, and an uncompleted plan session are **not** independent rest confirmation.
- `confirmedRestDates` is a **trusted-input interface, not a provenance verifier**. Production integration MUST validate who asserted rest, its scope, date/timezone, completeness across providers/manual imports, and the immutable audit evidence before supplying dates. Until then, production callers must not supply inferred rest.
- Future `futureDailyLoads` must have a matching `loadMetric`, finite nonnegative load, and date strictly after `endDate` within the forecast horizon. Missing future days are zero-load *scenario assumptions*, not assertions of rest.

## Model and limits

- Daily CTL and ATL are exponentially weighted moving averages with 42-day and 7-day time constants; TSB = CTL - ATL.
- The initial CTL/ATL equal the first verified day's load. This is an **initialisation convention**, not evidence of a true athlete baseline. Production UI must disclose a warm-up/history sufficiency policy before interpreting absolute values.
- Calendar dates are UTC date keys in this pure helper. Provider and athlete local-date reconciliation must occur upstream, explicitly.
- Forecast output is not suitable for automatically prescribing intensity, volume, diagnosing fatigue, or injury-risk classification.
- The engine rejects malformed ranges, history spans over ten years, missing metrics, unknown/invalid historical days, out-of-window future loads, and invalid horizons.

## Activation checklist

1. Verify complete multi-provider activity ingestion, de-duplication, manual entries and per-session load-method provenance.
2. Implement independent rest evidence with athlete/coach authorization and audited timezone-aware dates.
3. Establish a consistent load metric and individualised baseline/warm-up policy; test cross-provider equivalence and missing streams.
4. Expose a *read-only* forecast with clear assumptions and unknown-data states, then test at mobile widths.
5. Build a separate deterministic adjustment proposal and athlete/authorised-coach approval flow. No implicit save, AI-authored load prescription or plan mutation.
6. Run negative-case, integration, permission, and end-to-end tests in staging. Record exact deployed source and production smoke evidence.

Related: PR #80 (historical coverage), PR #84 (forecast), PR #85 (micro-adjustment write safety).
