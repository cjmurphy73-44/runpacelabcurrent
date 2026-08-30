# Science module — citations & limitations

This directory is the auditable core of TrainPaceLab. Every formula is a pure
function (no React, no I/O), types are explicit, and each source file opens with
a citation header naming the primary source and the known limitations. The
golden-case regression suite (`src/science/__tests__/goldenCases.test.ts`) pins
the expected output; CI fails on drift without a written justification.

## Primary sources

| Module            | Formula                              | Citation                                                           |
|-------------------|--------------------------------------|--------------------------------------------------------------------|
| load.ts            | CTL / ATL EWMA, TSB                  | Coggan, A. 2003. Performance Manager Chart (PMC).                  |
| load.ts            | rTSS                                 | Coggan 2003 (running-form analog of TSS, pace-based IF).           |
| load.ts            | hrTSS                                | Coggan 2003, HR-reserve ratio vs lactate-threshold HR.             |
| trimp.ts           | Banister TRIMP                       | Banister, E.W. 1991. *Modeling elite athletic performance.*        |
| vdot.ts            | VDOT, training paces, equivalent times | Daniels, J. 2013. *Daniels' Running Formula* (2nd ed.).          |
| zones.ts           | Pace zones (%VO2max bands)           | Daniels 2013.                                                      |
| zones.ts           | Heart-rate zones (Karvonen / %max)   | Karvonen, M. 1957. HR-reserve scaling.                              |
| grade.ts           | Minetti energy cost C(g), GAP, NGP   | Minetti et al. 2002. *J Exp Biol* 205:959–971.                     |
| grade.ts           | Efficiency Factor, aerobic decoupling | Skiba, A. (TrainingPeks) Efficiency Factor & Pa:HR decoupling.  |
| environment.ts     | Dew point (Magnus–Tetens)            | Alduchov & Eskridge 1996.                                          |
| environment.ts     | Heat-stress pace adjustment          | Empirical coach-consensus bands (NOAA/NASEM heat-index guidance).  |
| environment.ts     | Altitude pace loss                   | Daniels & Jones altitude performance decline.                      |
| thresholdPace.ts   | Empirical threshold-pace derivation  | Daniels T-pace + Lucia 2000 LTHR anchoring + recency-weighted blend. |
| injury.ts          | Acute:Chronic Workload Ratio (ACWR)  | Gabbett, T.J. 2016. *BJSM*.                                         |
| racePacing.ts      | Grade + heat + glycogen split pacing | Minetti 2002; heat bands (environment.ts); standard endurance pacing. |
| racePrediction.ts  | Race-time equivalence + confidence   | Daniels 2013 (VDOT↔time); Coggan 2003 (TSB form modifier).          |

## Known limitations & caveats

- **ACWR is contested.** Impellizzeri et al. 2020 (*BJSM*) showed ACWR's injury
  predictive power is not supported by appropriately controlled studies. The
  `injury.ts` bands flag load spikes for *review*, not injury causation. The UI
  must distinguish "performance optimization" from "injury prevention" and carry
  a correlational-not-causal disclaimer.
- **EWMA conflates intensity and volume.** Two days with identical TSS but
  different intensity contribute identically to CTL/ATL.
- **VDOT rejects short efforts.** < 180 s / < 1200 m inputs throw — the formula
  inflates VDOT for sprints. Downstream callers must already filter to endurance
  efforts.
- **Minetti downhill clamp.** Beyond −12% grade, eccentric braking dominates and
  the downhill benefit no longer increases; GAP clamps the input grade.
- **Heat/altitude bands are heuristic.** They reproduce commonly published coach
  guidance and are not derived from a physiological model; acclimatization is
  ignored.
- **Threshold-pace gating.** A run qualifies as threshold-intensity only if avg
  HR is within ±8% of LTHR (when available), else pace within ±12% of the Daniels
  T-pace. With < 3 qualifying runs, the Daniels T-pace dominates the blend.

## Runtime integration status

The `src/science/` namespace is the canonical cited reference and is exercised by
the golden-case suite. New code (the race-prediction panel) imports from here.
Existing runtime modules (`lib/physiologyEngine.ts`, `math/*`, `base44/shared/
physiology.ts`, `lib/injuryEngine.ts`, `lib/algorithms/racePacingEngine.ts`) are
being progressively re-pointed at this namespace; until that rewiring is complete
they retain their original implementations, which this module mirrors verbatim so
reviewers can audit the same math users see.

## Reviewer protocol

1. `npm install && npm test` — the golden-case suite must be 100% green.
2. Confirm each formula matches its cited source. Any disagreement is a finding.
3. Drift in a golden case without a written justification in the commit is a
   regression and blocks CI (`.github/workflows/ci.yml`).