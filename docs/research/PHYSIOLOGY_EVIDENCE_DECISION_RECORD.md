# Physiology evidence decision record — training-load models (9 November 2026)

**Status:** researched proposal, **not approved**; no code or athlete data changed. Existing G0–G3 gates remain open. Source review is selective, not a systematic review or an individual-athlete validation study.

## Primary and critical sources

1. Morton RH, Fitz-Clarke JR, Banister EW (1990). *Modeling human performance in running*, Journal of Applied Physiology 69(3), 1171–1177. DOI: https://doi.org/10.1152/jappl.1990.69.3.1171 . Dual exponentially decaying training-response terms model performance; the original model includes individual response parameters. This supports using an explicit impulse-response framework but **not** universal readiness thresholds.
2. Busso et al. (1997), *Modeling of adaptations to physical training by using a recursive least squares algorithm*, Journal of Applied Physiology. https://doi.org/10.1152/jappl.1997.82.5.1685 . The model includes individual gains and time constants, which are not equivalent to an uncalibrated 42/7 CTL/ATL display.
3. Soligard T et al. (2016), IOC consensus, *How much is too much? (Part 1)*, British Journal of Sports Medicine. DOI https://doi.org/10.1136/bjsports-2016-096581 . Distinguishes internal/external load and recommends multiple athlete-specific markers, symptoms and wellbeing rather than one standalone metric. Its historical acute:chronic ratio examples should not be copied as universal injury thresholds.
4. Impellizzeri FM et al. (2020), *Training Load and Its Role in Injury Prevention, Part 2: Conceptual and Methodologic Pitfalls*, Journal of Athletic Training. https://pmc.ncbi.nlm.nih.gov/articles/PMC7534938/ . Warns that methodological and causal limitations prevent straightforward injury-prevention prescriptions from acute/chronic load associations.
5. WKO5/TrainingPeaks technical explainer, *How To Analyze Runners' Training Load In WKO Using The Performance Manager Chart*. https://wko5.zendesk.com/hc/en-us/articles/8012212996621-How-To-Analyze-Runners-Training-Load-In-WKO-Using-The-Performance-Manager-Chart . Documents the **product convention** of approximately 42-day CTL and 7-day ATL exponentially weighted averages of TSS; this is a vendor convention, not a validation of TPL's initialization or athlete-specific calibration.
6. *The Current State of Subjective Training Load Monitoring: Follow-Up and Future Directions* (2022). https://pmc.ncbi.nlm.nih.gov/articles/PMC9012875/ . Explores alternative EWMA/SMA horizons; empirical selection varies with dataset and outcome, cautioning against treating 42/7 as universally optimal.

## Proposed decision register (requires science and product sign-off)

| Decision | Provisional engineering direction | Evidence and remaining uncertainty |
| --- | --- | --- |
| Display smoothing | Keep existing 42/7 exponential-time-constant EWMA **only as a documented legacy workload visualization**, with explicit formula/version | Product convention and exponential decay model are established, but 42/7 and initialization are not universal physiology constants; span EWMA is not numerically equivalent |
| Initialization | Do **not** interpret first-day-seeded CTL/ATL as established fitness/fatigue; mark cold start and coverage, and test zero-seed vs warm-up sensitivity | No cited source establishes TPL's exact first-observation seeding as validated; decision pending |
| TSB reference instant | Specify prior-day morning vs post-load same-day; version and label it before changing existing values | Mathematical interpretation changes with the reference instant; requires UX/product approval |
| Training stress units | Do not combine Banister TRIMP, hrTSS and rTSS numerically unless a reviewed conversion/calibration is validated | Distinct inputs and weighting conventions; a single unit must be selected or separate tracks displayed |
| Missing days | Distinguish confirmed rest, unobserved day and delayed provider sync; do not infer rest from absent uploads | Data completeness can bias EWMA; design rule, not a directly validated scientific threshold |
| Athlete readiness/injury | Do not diagnose injury or green-light hard sessions from TSB bands alone | IOC multifactor monitoring and later causal-method critiques |
| Training-plan forecast | Treat fixed duration/intensity multipliers as scenario assumptions, never measured stress | TPL implementation heuristic, not established individualized calibration |
| Individual calibration | Future research should evaluate actual performance, session RPE, subjective fatigue, symptoms and quality of HR/pace data | The response-model literature supports individual parameters; no TPL dataset validation yet |

## Mathematical reference and fixtures (provisional, not code approval)

For a **chosen compatible daily stress unit** `x_t` and known day interval `Δt`, an exponential-time-constant smoother is

`L_t = L_(t-1) + (1 - exp(-Δt/τ)) * (x_t - L_(t-1))`.

For daily steps, `τ_CTL = 42`, `τ_ATL = 7` are candidate *display conventions*, not clinical parameters. A span-based smoother instead uses `α=2/(N+1)`; it must never be silently substituted. With no valid prehistory, the initial state and history-coverage flag must be explicit. `TSB = CTL - ATL` is a modeled difference, not a direct physiological measurement.

Golden fixtures must include a single impulse, two same-day activities, seven training days, observed rest versus missing sync, daylight-saving changes, cold start, revised activity, and mixed stress units. Compare unrounded backend values before presentation rounding. Independently derive expected fixture numbers from the approved equation; do not snapshot current code output as proof of scientific correctness.

## Implementation and safety implications

- The current `src/lib/loadForecasting.js` UI uses first-day seeding, 42/7 exponential coefficients, `session_trimp || session_tss`, and uncalibrated projection multipliers. Its displayed bands have been made descriptive on PR #9, but **mixed stress units and unknown history remain unresolved**.
- The alternative `src/lib/metrics/loadEngine.ts` span-based calculation and backend dispatch must not be merged into a common authoritative service without a signed formula contract.
- Do not use acute:chronic ratio cutoffs or TSB bands to assert individual injury probabilities. Escalate concerning symptoms to appropriate human assessment rather than generating a definitive medical label.
- Use a versioned calculation record with stress provenance, timezone, input completeness, cold-start status, evaluation instant and forecast uncertainty.
- Coach language should distinguish observed facts, modeled estimates and athlete-reported symptoms; an LLM may explain a deterministic decision but not override constraints.

## Evidence gaps and next bounded action

1. Locate and assess primary validation papers for candidate running-specific rTSS, hrTSS and Banister TRIMP coefficients; distinguish proprietary/vendor formulas from open literature.
2. Define a proposed missingness and cold-start policy with concrete numerical golden fixtures.
3. Seek independent sports-science review and product sign-off on units, smoothing, initialization, timezone and TSB semantics before implementing.
4. G0–G3 release/security/data gates and Odysseus preservation remain separate prerequisites; **no science implementation authorized by this document**.
