# Science research and integration register

Status: research-backed **minimum safety contract**, not complete validation of every physiology feature. Reviewed 2026-11-14. Research supports modelling and monitoring principles; it does not validate TrainPaceLab's specific algorithms, thresholds, clinical outcomes or predictions.

## Research evidence

1. Morton RH, Fitz-Clarke JR, Banister EW (1990). *Modeling human performance in running*. Journal of Applied Physiology 69(3), 1171–1177. DOI: [10.1152/jappl.1990.69.3.1171](https://doi.org/10.1152/jappl.1990.69.3.1171). A training impulse produces two decaying responses (fitness and fatigue). Athlete-specific coefficients and performance calibration are required to make individual performance predictions. A 42/7 EWMA is **not** the calibrated Banister performance model.
2. Halson SL (2014). *Monitoring training load to understand fatigue in athletes*. Sports Medicine 44(Suppl 2), 139–147. DOI: [10.1007/s40279-014-0253-z](https://doi.org/10.1007/s40279-014-0253-z). Internal and external training-load metrics and subjective measures are complementary; no single definitive fatigue marker exists. The review describes session-RPE load as duration (minutes) times RPE, a separate unit from HR-based TRIMP and power-based TSS.
3. Impellizzeri FM et al. (2020). *Acute:Chronic Workload Ratio: Conceptual Issues and Fundamental Pitfalls*. DOI: [10.1123/ijspp.2019-0864](https://doi.org/10.1123/ijspp.2019-0864); [PubMed 32502973](https://pubmed.ncbi.nlm.nih.gov/32502973/). ACWR cannot establish that manipulating a ratio causally reduces injury. No ACWR-only “safe progression”, injury diagnosis, or automatic percentage reduction is supported.
4. *Rationale and resources for teaching the mathematical modeling of athletic training and performance*. Advances in Physiology Education. [DOI:10.1152/advan.00078.2011](https://doi.org/10.1152/advan.00078.2011). Summarises the fractional heart-rate-reserve TRIMP formulation and its limitations; distinguishes HR-derived TRIMP from power-derived training stress scores.

## Implementation mapping and honest labels

| App function | Deterministic method | Supported interpretation | Blocked claim / release gate |
| --- | --- | --- | --- |
| Session load | HRR-weighted TRIMP from usable stream, or labelled average-HR estimate | Relative internal training load with method/coverage | Never label a 30%-covered recording as a fully measured session; verify HR bounds, timebase, gaps, duration and full recording coverage |
| CTL / ATL / TSB | EWMA 42/7 and difference | Descriptive smoothed workload trend and balance | Not actual measured fitness, fatigue, readiness or injury risk; require complete daily history and stable load units |
| Banister impulse-response | Two decaying components with fitted parameters | Modelled training-response scenario | No individual performance prediction until athlete-specific parameter fit and out-of-sample validation |
| ACWR | Acute load divided by chronic load | Descriptive ratio with uncertainty | No injury-risk diagnosis or automatic +/- percentage prescriptions |
| Readiness | Deterministic fusion of recovery observations | Contextual indicator only | Must disclose missing inputs and individual baselines; no medical or guaranteed recovery claim |
| HR zones | Athlete-specific HRR/threshold boundaries | Training-intensity display if calibrated | Zone *time* only from valid timestamped streams, not summary average |
| Cycling NP/TSS | Power stream and athlete FTP | Power-based load in its own units | Never sum or substitute for HR-based TRIMP without separately validated transformation |
| Run grade/pace | Minetti grade correction / pace models | Conditional estimates with terrain and calibration assumptions | Not directly observed oxygen consumption or universal race performance |
| Adaptive plans | Verified history + deterministic proposal + athlete/coach approval | Human-reviewed recommendation | No unattended mutation, no unverified rest, no LLM-derived physiological calculation |

## Integration progress and release blockers

- The legacy `src/science/adaptiveEngine.ts` adapter has been changed to return **zero automatic adjustment** for every ACWR and explicit caution text, with regression tests. This removes unsupported threshold-based prescription from that path. Other callers must be audited independently.
- PR #80 / #84 add history coverage and unit-isolated forecast scenario logic, but these are not yet integrated into the live backend or a calibrated model.
- PR #85 blocks unverified `requestMicroadjustment` writes. This is a temporary safety state, **not a finished adaptation feature**.
- A dedicated optional Science/Methodology UI should expose formulas, provenance and limitations without overwhelming the dashboard. It is not yet evidence that the complete application has been scientifically validated.
- Before production: trace every displayed value from ingest through backend calculation and frontend rendering; compare against independent reference implementations and golden cases; perform missing-data, timezone, outlier, mixed-sport, permissions and real-device E2E tests; calibrate and prospectively validate any predictive model.

## Scientific acceptance rule

For every numerical output store/display: source provider, recording versus estimate, metric unit, method/version, coverage, athlete calibration inputs, data date and missing-data state. If these are unavailable, show **not enough verified data** instead of inventing precision. No physiological model is a medical diagnosis.

## Research verification note (2026-11-14)

The ACWR critique's bibliographic DOI was checked against PubMed: **10.1123/ijspp.2019-0864**. The Banister TRIMP HR-reserve equation and sex-specific coefficients were cross-checked against the Journal of Applied Physiology article *Dose-response relationship of the cardiovascular adaptation to endurance training in healthy adults* (2003), DOI **10.1152/japplphysiol.00482.2003**, appendix. This is independent support for the formula, **not** validation of individual athlete calibration or of arbitrary missing-HR defaults. A backend hardening PR now rejects impossible HR calibration and does not manufacture a resting HR of 60 bpm when unavailable. The existing WorkoutSession schema still stores a numeric zero with `load_source='none'` for unavailable HR load; downstream analysis must treat that provenance as **unknown**, not verified rest or zero exertion.
