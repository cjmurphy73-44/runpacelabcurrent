# Model-complexity stress test: one-state versus two-state — 9 November 2026

**Status:** one atomic synthetic numerical research task; no app runtime, staging, athlete data or production changes. The previous roadmap/research commit `0a2a8c5957eaaad3995da3570f30abe84d3a311d` had successful GitHub workflow run 42560426807. G0–G3, independent review and Odysseus preservation remain release blockers.

## Hypothesis

A more flexible two-state impulse-response model can improve held-out prediction when the data-generating process has two timescales, but may overfit a one-state process, especially with sparse observations.

## Experiment

Twelve independent seeds per scenario. For each: 210 days of daily training stress `u=max(0,Normal(55,20))`, with every seventh day set to zero. Add independent Gaussian performance observation noise with standard deviation 2. Train on observed days in `[0,140)` sampled weekly or every 28 days; evaluate on days 140,147,...,203. Fit one-state `y=E_τ,k(u)` and two-state `y=E_τF,kF(u)-E_τD,kD(u)`, where `E` is the daily recursion `x_t=exp(-1/τ)x_(t-1)+ku_t`, initialized at zero. Three randomized least-squares starts per fit; choose minimum training residual. All outcomes are arbitrary synthetic performance units.

Generators:
- **Two-state:** `E_42,.025(u)-E_7,.045(u)`.
- **One-state:** `E_28,.022(u)`.
- **Nonlinear saturation:** `E_42,.04(70u/(70+u))-E_7,.045(u)`. This deliberately violates the candidate models' linear-input assumption.

| Generator | Observation interval | One-state held-out MAE | Two-state held-out MAE | Seeds where two-state lower MAE |
| --- | --- | ---: | ---: | ---: |
| Two-state | 7 days | 4.575 | 2.225 | 10/12 |
| Two-state | 28 days | 4.786 | 3.637 | 7/12 |
| One-state | 7 days | 1.847 | 1.923 | 5/12 |
| One-state | 28 days | 2.204 | 3.075 | 4/12 |
| Nonlinear saturation | 7 days | 4.131 | 2.351 | 10/12 |
| Nonlinear saturation | 28 days | 3.886 | 3.626 | 7/12 |

**Interpretation:** The two-state model wins under its own generator, loses on average under the simpler generator, and sometimes helps approximate nonlinear dynamics. Monthly performance observations reduce reliability. This is a *synthetic misspecification check*, not evidence that two-state models outperform simpler models on real athletes. Sample size is small, no confidence intervals are reported, and there is no individualized injury or readiness validation.

## Reproducibility

Python 3, NumPy, SciPy; seed each synthetic athlete with `default_rng(12000+seed)` for seed 0..11, **reset for each scenario and observation schedule**. Draw all 210 stress values first, set `u[::7]=0`, then draw 210 independent normal performance errors. For each model, use `scipy.optimize.least_squares` with three initializations drawn from the same RNG. One-state initial parameters: `τ~Uniform(10,70)`, `k~Uniform(.001,.1)`; bounds `[2,0]` to `[120,.3]`. Two-state initial parameters: `τ_F~Uniform(20,70)`, `τ_D~Uniform(2,25)`, `k_F,k_D~Uniform(.01,.09)`; bounds `[5,1,0,0]` to `[120,60,.3,.3]`. `max_nfev=100`; lowest training sum of squared residuals wins. MAE computed over ten future weekly observations per seed. Floating point and optimizer differences may change last digits.

## Engineering incorporation and whole-roadmap dependencies

- **G0** remains first: CI exact-head evidence, private staging isolation, independent review, Odysseus original-Mac preservation and synthetic FIT/dashboard acceptance. The successful older CI run is not a new release approval.
- **G1–G3** secure athlete/coach ownership, billing and Garmin/COROS ingestion before any personalized model consumes data. Preserve timestamp/timezone, stress-method provenance and unknown-vs-rest distinction.
- **G4**: start with versioned deterministic load; keep one-state and two-state modeling as optional research candidates. Require a documented target, adequate observed performance, forward-time and athlete-held-out validation, parameter uncertainty and an explicit simpler-model fallback.
- **G5**: delete model features, derived parameter histories and forecast caches alongside athlete data under approved retention rules.
- **UX/assets/QA**: display uncertainty and evidence coverage clearly; maintain mobile/iPad accessibility, branded icon/logo/imagery queue, provider sync feedback, synthetic screenshot fidelity, QA and release acceptance.
- **No silent promotion:** do not let the coach select a complex model based solely on lower in-sample error or use it to generate unsupported injury probabilities.

## Next atomic task

Design and document a pre-registered evaluation rubric: uncertainty intervals, dimensionless parameter-Jacobian SVD, missing-sync scenarios, calibration, realistic performance confounders and comparison against persistence/one-state models. Implement only a separately reviewed research benchmark, not athlete-facing coaching, until gates and scientific review clear.
