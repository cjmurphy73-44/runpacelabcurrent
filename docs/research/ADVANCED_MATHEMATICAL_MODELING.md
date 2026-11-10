# Advanced mathematical modeling research — TrainPaceLab (9 November 2026)

**Status:** research hypotheses and mathematical design, not approved production algorithms. Existing G0–G3 and independent review gates remain in force. No athlete data or runtime code changed.

## Evidence that changes the modeling strategy

- Peng, Brodie, Swartz & Clarke, *Bayesian inference of the impulse-response model of athlete training and performance*, International Journal of Performance Analysis in Sport 24 (2024), 74–89, DOI https://doi.org/10.1080/24748668.2023.2268480 . Bayesian priors and constraints improved plausibility/precision versus nonlinear least squares in a proof-of-principle national-class middle-distance athlete; this is not broad external validation.
- *Statistical flaws of the fitness-fatigue sports performance prediction model* (2025), PubMed https://pubmed.ncbi.nlm.nih.gov/39881202/ . Bayesian diagnostics found ill-conditioning, weak parameter identifiability and overfitting; fatigue parameters did not materially improve held-out predictive performance in two datasets. Strong reason **not** to assume a more complex model is better.
- Impellizzeri et al., *Acute:Chronic Workload Ratio: Conceptual Issues and Fundamental Pitfalls* (2020), DOI https://doi.org/10.1123/ijspp.2019-0864 . Warns against treating ratio associations as causal injury risk.
- *Comparison of Weekly Training Load and Acute:Chronic Workload Ratio Methods to Estimate Change in Training Load in Running* (2024), https://pmc.ncbi.nlm.nih.gov/articles/PMC11537214/ . Methods flagged materially different running sessions as load spikes; no validated universal threshold.
- Impellizzeri et al., *Training Load and Its Role in Injury Prevention, Part 2* (2020), https://pmc.ncbi.nlm.nih.gov/articles/PMC7534938/ . Causal and measurement limitations require conservative claims.

## Mathematical research tracks, ordered by prerequisite

### A. Identifiable impulse-response / state-space models

Let daily stress `u_t` be a versioned, single-method observed stimulus. A candidate two-state linear stochastic model is

`F_(t+1) = exp(-Δt/τ_F) F_t + k_F u_t + η_(F,t)`
`D_(t+1) = exp(-Δt/τ_D) D_t + k_D u_t + η_(D,t)`
`y_t = p_0 + F_t - D_t + ε_t`

where `y_t` must be a separately observed performance measure (e.g., standardized time trial, pace-at-HR with controlled conditions), not CTL/ATL relabeled as ground truth. Gaussian process/observation noise gives a linear-Gaussian state-space model conditional on fixed parameters; Kalman filtering/smoothing is then appropriate. Nonlinear observation mappings, interval data or unknown parameters may require extended/unscented filters or Bayesian posterior sampling.

**Identifiability trap:** If only workload is observed, `F,D,k,τ` cannot be learned as distinct physiological states. Even with sparse performance outcomes, gains, baselines and time constants may be weakly identified. Require simulation-based calibration, posterior correlations, profile likelihood and sensitivity checks; compare a one-state and baseline model.

### B. Hierarchical Bayesian personalization

Candidate partial pooling:
`log τ_(F,i) ~ Normal(μ_F, σ_F²)`,
`log τ_(D,i) ~ Normal(μ_D, σ_D²)`,
`log k_(F,i) ~ Normal(μ_kF, σ_kF²)`.

Use log transforms to enforce positivity, explicit plausible priors and a consented population dataset; no inferred demographic coefficient substitution without validation. For cold-start athletes use prior predictive intervals and conservative recommendations, not fitted certainty. Posterior predictive checks, calibration and leave-one-athlete-out validation are mandatory.

### C. Uncertainty-aware training-stress measurement

Represent each activity with source and method provenance; distinguish measurement error in heart rate, threshold pace, GPS/elevation and session RPE. Candidate latent-stress measurement model:
`z_(m,t) = a_m + b_m u_t + ε_(m,t)`
for method `m`, **only if** paired measurements and sufficient identifiable calibration data exist. Without such data, keep TRIMP, pace proxy and HR proxy as separate non-interchangeable series. Unknown/missing sessions are not zeros. Compare missing-at-random assumptions against provider outage and informative missingness.

### D. Robust model predictive control (research only)

Given a validated predictive distribution, optimize a training horizon:
`max_{u_(t:t+H)} E[performance_at_goal] - λ Var(performance_at_goal) - γ plan_disruption`
subject to clinician/coach-approved hard constraints on schedule, athlete preferences, workload changes, recovery, symptoms and training availability. Use chance constraints only if the associated event probabilities are empirically calibrated. Never use TSB or ACWR as an unsupported injury-probability oracle. Provide feasible fallback (hold or human review) when confidence is low.

### E. Causal evaluation rather than association mining

Do not use retrospective injury correlation as evidence that an intervention prevents injury. Pre-register outcomes, define treatment decisions and confounders, and evaluate policies prospectively where ethical/feasible. Avoid mathematical coupling in acute/chronic ratios, leakage across athletes, future-data leakage in backtests and training/testing on overlapping activity windows.

## Concrete baseline comparison protocol

1. Define observable target: standardized race/time-trial performance, performance-adjusted pace/HR, or a separately labeled subjective readiness outcome. Do not use a model-derived metric as its own validation target.
2. Baselines: last observed performance, simple exponentially smoothed workload plus covariates, one-state adaptation, two-state Banister model, hierarchical Bayesian model.
3. Rolling-origin evaluation with athlete-held-out splits, temporal embargo for overlapping windows, and strict source/provenance audit.
4. Compare MAE/RMSE (appropriate performance scale), proper probabilistic scores (log score/CRPS), interval coverage, calibration, missingness robustness, subgroup drift, parameter stability and operational complexity.
5. Use ablation and synthetic identifiability experiments; reject complex models that do not improve held-out skill or calibration.
6. Human review for coach decisions and athlete safety; performance prediction is not injury diagnosis.

## Proposed source-independent numerical golden fixtures

For a daily impulse of 100 stress units with zero initial load and `α_τ = 1-exp(-1/τ)`, expected first-day CTL is `100(1-exp(-1/42)) ≈ 2.353` and ATL `100(1-exp(-1/7)) ≈ 13.312`; post-day TSB is approximately `-10.959`. Under first-observation seeding the same first-day state is `CTL=ATL=100, TSB=0`. These are distinct **mathematical policies**, not evidence that either represents actual fitness.

For 60 minutes at HRavg=150, HRrest=50, HRmax=200, `r=2/3`. Published Banister reference pairs yield:
- `TRIMP_m = 60*(2/3)*0.64*exp(1.92*(2/3))`
- `TRIMP_f = 60*(2/3)*0.86*exp(1.67*(2/3))`
The existing `src/lib/physiologyEngine.ts` uses neither expression. Golden fixtures must explicitly fail the current implementation without changing it until approved.

For 3600 s at average pace = threshold pace, the simple average-pace stress proxy returns 100. This does **not** establish parity with graded-pace rTSS. For HR threshold equal to resting HR, reject input rather than producing NaN/Infinity. Mixing TRIMP and threshold-normalized stress must return an incompatibility result rather than an arbitrary sum.

## Decisions needed before coding

- Confirm a measurable prediction target, minimum history and representative consented data; without observed performance there is no empirical identification of fitness/fatigue response parameters.
- Independent sports-science and statistical review of the baseline hierarchy, uncertainty semantics and training constraints.
- Define stress unit/provenance and missingness contract; approve specific formula and cold-start behavior.
- Preserve strict distinction between descriptive workload dashboards, predictive performance models and clinical risk.
- Existing G0–G3, independent review and Odysseus preservation requirements still block new science implementation.

**Next atomic research task:** compute and independently cross-check golden-reference values for the above equations, then write an executable-but-non-production fixture specification and a model-selection acceptance rubric. Do not ship model-predictive coaching before out-of-sample validation.
