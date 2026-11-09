# Training-stress methods: evidence and source-code reconciliation — 9 November 2026

**Research-only, not approved for runtime implementation.** Reviewed published physiology explanations, TrainingPeaks product documentation and existing source on `fix/provider-connection-feedback`. This is not an independent systematic review or reverse-engineering authorization for proprietary algorithms. No athlete data, backend code or deployment changed.

## 1. Banister heart-rate-reserve TRIMP

Let `r = (HRavg - HRrest)/(HRmax - HRrest)` and `t` be session minutes. A published restatement of the Banister method (e.g. *J Appl Physiol* 2003, https://journals.physiology.org/doi/full/10.1152/japplphysiol.00482.2003) gives:
- Male empirical weighting: `TRIMP = t × r × 0.64 × exp(1.92 × r)`.
- Female empirical weighting: `TRIMP = t × r × 0.86 × exp(1.67 × r)`.

These are historical population-derived coefficients, not universal individual calibration; avoid treating a binary demographic selection as sufficient physiology modeling. The calculation requires finite duration and HR values, `HRmax > HRrest`, and plausible HR bounds. An average HR loses information about variable intervals, and HR may lag exercise intensity.

**Confirmed source defect:** `src/lib/physiologyEngine.ts` currently defines `genderCoeff = gender === 'M' ? 0.86 : 1.67` and returns `t × r × 0.64 × exp(1.92r) × genderCoeff`. It implements **neither** published coefficient pair. For an illustrative 60-minute session with HRavg=150, HRrest=50, HRmax=200 (`r=2/3`), the published male and female equations give different results, whereas the source multiplies the male formula by an extra factor. This must be flagged as a defect, not silently fixed before science review, caller audit and gates.

## 2. Running pace-based stress

TrainingPeaks rTSS uses **normalized graded pace (NGP)** from a pace/elevation time series and a running threshold pace, not merely average pace. See Stephen McGregor's original description, https://www.trainingpeaks.com/learn/articles/running-training-stress-score-rtss-explained/ , and https://help.trainingpeaks.com/hc/en-us/articles/204071944-Training-Stress-Scores-TSS-Explained .

TPL's `src/math/load.ts` and `src/science/load.ts` use `100 × (durationSeconds/3600) × (thresholdPace/averagePace)^2`. This is a **simplified flat-average-pace proxy**, not an implementation of NGP-based rTSS. A one-hour threshold-pace session gives 100 by construction, but terrain, GPS quality, grade and intervals may change the interpretation. Mark as `PACE_AVERAGE_PROXY_V1` in any future data model; do not imply TrainingPeaks-equivalent rTSS or use its trademark as a generic method identifier without product/legal review.

## 3. Heart-rate training stress: hrTSS vs TRIMP

TrainingPeaks describes hrTSS as based on **time in threshold-HR-based zones**, with lower fidelity for variable efforts; its separate tTSS fallback uses duration and average HR with physiological HR properties. See https://help.trainingpeaks.com/hc/en-us/articles/204071944-Training-Stress-Scores-TSS-Explained and https://help.trainingpeaks.com/hc/en-us/articles/204071844-TSS-calculation-troubleshooting .

TPL's `calculatehrTSS` in both `src/math/load.ts` and `src/science/load.ts` computes `100 × (durationSeconds/3600) × (avgHRreserve/thresholdHRreserve)^2`. This is an **HR-reserve ratio squared proxy**, not established as TrainingPeaks' zone-time hrTSS. A threshold HR equal to resting HR makes its denominator zero; current code does not reject this case and may emit non-finite output. Invalid pace/HR can also be returned as zero, conflating missing or corrupt data with verified rest.

The separate Banister TRIMP is in **arbitrary units**, not automatically the same scale as threshold-normalized 100-per-hour stress. Do not aggregate TRIMP and either proxy into one CTL/ATL series without an explicitly reviewed conversion and empirical calibration.

## 4. Comparative decision table

| Method | Inputs | What can be claimed | Main limitation | TPL recommendation |
| --- | --- | --- | --- | --- |
| Banister TRIMP | Minutes, HRavg, resting/max HR, chosen published coefficient set | Historical HR-reserve-weighted internal-load estimate (AU) | HR lag, averages mask intervals; coefficients population-derived | Correct formula only after science approval; separate method ID and AU |
| Pace-average proxy | Duration, average pace, running threshold pace | Simple threshold-normalized pace stress proxy | No grade/interval normalization | Keep explicitly labeled as proxy; validate against high-quality running data |
| NGP-based rTSS | Pace/elevation time series, threshold pace | Vendor-defined running stress metric | Proprietary method details, terrain and sensor quality | Do not claim equivalence without independently implementable approved method |
| HR-reserve-squared proxy | Duration, average/rest/threshold HR | Simple threshold-normalized HR stress proxy | Not vendor hrTSS; HR threshold division risk | Label proxy, reject invalid denominator |
| Zone-based hrTSS | HR time series, sport-specific threshold HR/zones | Vendor-described HR-zone-derived stress | HR lag and threshold calibration | Research an independently documented alternative; no unsupported parity claim |
| TRIMP-derived tTSS | Duration, HRavg and HR reference values | Vendor-described fallback stress estimate | Conversion details not established here | Do not assume numeric equality with Banister TRIMP |

## 5. Review and test requirements

1. Add isolated **reference formula fixtures** (without modifying runtime behavior) for published Banister coefficient pairs and negative/non-finite HR/duration cases. Explicitly distinguish expected published output from current buggy output.
2. Add **method provenance and input-completeness fields** to the proposed backend contract; prevent a numeric `session_trimp || session_tss` fallback from silently mixing units.
3. Decide which stress metric is the **canonical daily unit** only after reviewing available wearable samples, athlete threshold quality, and independent sports-science input. Missing pace/elevation or HR is not evidence of zero stress.
4. Evaluate continuous HR/pace series versus workout averages, terrain effects, and changes in individual thresholds. Avoid presenting recovery/injury certainty from load alone.
5. Product/legal review of vendor trademarks and proprietary NGP implementation claims; favor independently specified algorithms.

**Engineering disposition:** Source defect and nomenclature mismatch documented; no science formula change is authorized by this research. G0–G3 acceptance, review and Odysseus preservation remain blockers for runtime science work. Next bounded task: add source-independent golden-reference fixture documentation with numeric cases and error policies, then seek scientific approval.
