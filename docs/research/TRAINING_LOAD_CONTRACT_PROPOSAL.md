# Training-load calculation contract — proposal v0 (9 November 2026)

**Status:** design only; not approved for implementation or release. G0–G3 acceptance remains required. This specification deliberately does not select an unvalidated physiological model.

## Scope and boundary

A single backend-owned, deterministic calculation service will own activity stress, daily aggregation, load state and the input facts used by the coach. The frontend may render a versioned backend result and a forecast explicitly marked estimated; it must not silently recompute a different authoritative CTL/ATL/TSB. Generative AI can explain the decision record but cannot substitute missing measurements or override deterministic constraints.

## Input schema (proposed)

- Athlete identity and authorized tenant/owner, immutable activity identifier, source/provider and ingest revision.
- UTC start/end instants and explicit IANA athlete training timezone at the activity date; the derived athlete-local training date is recorded with its timezone provenance.
- Raw duration, distance, pace/power/HR samples and threshold/reference values with measurement units, timestamps and validity flags. Missing is not zero.
- Stress estimate as `{value, unit, method, methodVersion, confidence, inputCompleteness}`. Example methods rTSS, hrTSS and TRIMP remain distinct, **not additive or interchangeable** without an approved conversion.
- Explicit rest/unknown-day classification. No workout record is not proof of rest. Duplicate provider events reconcile by stable activity identity and revision.

## Output schema (proposed)

- Daily series: local date, source activity IDs, stress total **only within one compatible method/unit**, missingness classification and confidence.
- Load series: `ctl`, `atl`, `tsb`, evaluation instant/date, unit, smoothing policy, initialization state, history coverage, method/version and rounded presentation values alongside unrounded internal values.
- Forecast series: planned stress assumptions, estimation method/version, horizon and uncertainty flags. Forecasts must be labeled *scenario estimates*.
- Coach facts: provenance-linked metrics, freshness, uncertainty and deterministic constraints; a separately versioned recommendation/hold decision and human-readable rationale.

## Decisions requiring explicit science approval

1. Choose stress unit and permitted conversion hierarchy. HR-based TRIMP, hrTSS and pace-based rTSS cannot simply be pooled.
2. Choose smoothing: exponential `1-exp(-1/tau)` (tau 42/7 days) **or** span `2/(N+1)`; document whether missing days advance decay.
3. Choose cold start: zero prior state, seeded first observation, or insufficient-history status. Never imply a new athlete has established fitness.
4. Choose TSB temporal semantics: prior-day morning `CTL_previous - ATL_previous` or current post-load difference.
5. Choose training-day timezone, DST behavior, backfills/recomputations and source corrections.
6. Set minimum history coverage and confidence before coaching advice; thresholds for injury/recovery claims require independent evidence and athlete-specific validation.
7. Separate projected workload estimates from observed loads; document calibration and no-plan fallback.

## Contract invariants for implementation review

- Reject negative/non-finite duration, stress and invalid HR denominator; return typed errors rather than converting invalid inputs to rest.
- Explicit operation or combined `{ctl,atl,tsb}` response; never infer requested operation from defaulted argument presence.
- Stable results independent of provider ingestion order; one activity is counted once, multiple legitimate same-day activities sum once.
- Day gaps represented explicitly and distinguish known rest from unknown data; backfill is deterministic and revisioned.
- Version and provenance attached to every persisted load and coach recommendation; algorithm changes do not silently rewrite past explanations.
- Dashboard banner, chart, backend stored metrics and coach read the same versioned series and reference date.
- Model outputs are workload estimates, not direct physiological recovery, illness or injury diagnoses.

## Golden fixture matrix to prepare before code change

| Fixture | Assertion |
| --- | --- |
| Single 100-unit session, fresh athlete | Exact selected cold-start behavior; coverage shown |
| Seven consecutive training days | Independently calculated CTL/ATL/TSB, no rounding drift |
| Known rest day vs missing provider day | Distinct missingness and coach confidence |
| Two workouts on one local date | Aggregated once per activity, regardless of ingest order |
| UTC midnight and DST change | Correct athlete-local dates, stable ordering |
| Duplicate sync, edited workout, late backfill | Idempotent revision and deterministic recompute |
| Non-finite, negative and invalid HR threshold | Typed validation failure, no NaN or fake zero |
| Mixed TRIMP/rTSS/hrTSS | Explicit incompatible-method handling |
| Projected plan and no-plan scenario | Observed and forecast data never conflated |
| Dashboard banner/chart/coach parity | Identical version, dates and source metrics |

## Current-source compatibility and risk

- `src/lib/loadForecasting.js` currently powers banner and chart, uses 42/7 exponential coefficients, first-observation seeding and `session_trimp || session_tss`; projected stress uses uncalibrated duration factors. Its new TSB wording avoids clinical certainty but does not resolve mixed units.
- `src/lib/metrics/loadEngine.ts` uses span smoothing; `src/math/load.ts` and `src/science/load.ts` use exponential smoothing with different initialization. `base44/functions/calculateTrainingLoad/entry.ts` has unreachable ATL dispatch when `dailyTSS` is present.
- `LoadStatusCards.jsx` calls a function returning an array where CTL/ATL/TSB object is expected; `physiologyEngine.ts` contains hard-coded VDOT pace strings.
- Existing tests on PR #9 characterize current behavior, **not** acceptance of this proposed contract. Latest verified green run prior to this document: PR #9 commit `a6f5a155c751267fec1125d10cea23d6ccfe01ba`, six successful jobs in run 42556280429.

## Release gate and next atomic action

No new physiology implementation while G0–G3 are unaccepted. Next eligible bounded task: collect primary-method references and build a science decision record for smoothing, cold start, temporal semantics and unit compatibility, with reviewer sign-off before coding. Separately unblock Odysseus preservation, staging source identity and independent reviews under G0.

No source behavior, athlete records, staging environment or production deployment changed in this document.
