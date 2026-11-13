# Scientific evidence and validation register

Status: initial evidence register, 2026-11-14. This is not a completed validation of TrainPaceLab's implementation.

## Required standard for every physiological or training-prescription change

1. Specify the construct (what the number is and is not), population, sport, input source, units, equation, parameterization, window, missing-data behavior, and model initialization.
2. Cite primary peer-reviewed methods and relevant systematic reviews, including contradictory findings and limitations. Record DOI, study design, population, and evidence applicability.
3. Separate **published mathematical method**, **software implementation correctness**, **predictive validity in target athletes**, and **clinical/injury-risk claims**. These are different claims requiring different evidence.
4. Test against independent reference calculations and edge cases (missing data, clock/date boundaries, duplicate sessions, sensor gaps, nonfinite values, zero load, insufficient baseline). Never silently equate missing days to rest.
5. Label heuristic estimates as such. Do not prescribe changes solely from ACWR/TSB, infer injury probabilities, or claim physiological readiness without suitable validation.
6. Require explicit provenance and a review of evidence/limitations in every science PR. Unvalidated recommendations remain advisory; no automatic schedule mutation without confirmation.

## Initial source register

| Area | Peer-reviewed source | What it supports | Important limitation / required work |
| --- | --- | --- | --- |
| Impulse-response performance modelling | Busso et al., *J Appl Physiol* (1997), DOI: [10.1152/jappl.1997.82.5.1685](https://doi.org/10.1152/jappl.1997.82.5.1685) | A two-component fitness/fatigue impulse-response formulation with subject-specific gains and time constants | Does **not** validate TrainPaceLab's fixed coefficients or predict individual performance without calibration |
| Training load monitoring | Halson, *Sports Medicine* (2014), DOI: [10.1007/s40279-014-0253-z](https://doi.org/10.1007/s40279-014-0253-z) | Internal and external load monitoring, individualisation and multi-signal interpretation | No single definitive fatigue marker; HRV, TSB and similar indicators must not be represented as diagnoses |
| ACWR critique | Impellizzeri et al., *Int J Sports Physiol Perform* (2020), DOI: [10.1123/ijspp.2019-0864](https://doi.org/10.1123/ijspp.2019-0864) | Major conceptual and statistical limitations of ACWR for causal injury prevention | No evidence that changing ACWR itself prevents injury; avoid ACWR-triggered automatic prescriptions |
| ACWR systematic review | Andrade et al., *Sports Medicine* (2020), DOI: [10.1007/s40279-020-01308-6](https://doi.org/10.1007/s40279-020-01308-6) | Observational associations in elite team sports | Heterogeneous methods and narrow populations; not generalisable to endurance athletes as injury probabilities |
| Training-load injury inference | Impellizzeri et al., *J Athl Train* (2020), DOI: [10.4085/1062-6050-501-19](https://doi.org/10.4085/1062-6050-501-19) | Detailed methodological limitations, including missing data and causal inference | Descriptive training-load signals do not establish causal injury risk |

## Immediate implementation audit queue

- **EWMA CTL/ATL/TSB:** confirm recurrence, 42/7-day time constants, initialization and daily calendar completeness. These are model conventions, not validated athlete-specific physiology.
- **Banister model:** confirm separate positive/negative kernels, coefficients, calibration method, load units, and fit against actual performance.
- **ACWR:** retain only explicitly qualified descriptive use pending evidence review; never classify personal injury risk or drive automatic progression.
- **Readiness:** list each recovery signal, baseline duration, missingness and weights; do not treat a score as a medical or performance clearance.
- **Training prescription:** distinguish evidence-based periodisation principles from product-specific decision rules, and document all decision thresholds and human override.

Every science PR should update this register or link a more specific methods note, including counterevidence and tests. A citation alone is not proof that our implementation or application is validated.
