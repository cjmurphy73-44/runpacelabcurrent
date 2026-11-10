# Numerical identifiability experiment and TPL integration pathway — 9 November 2026

**Scope:** one atomic, source-only research task. No runtime model, database, staging or production changes. Follow G0–G3 science gates, independent review, Odysseus preservation and existing PR ownership. Companion research: `DYNAMICAL_SYSTEMS_AND_INVERSE_PROBLEMS.md`, `ADVANCED_MATHEMATICAL_MODELING.md`, `TRAINING_STRESS_METHOD_COMPARISON.md`.

## Question and experiment

How sensitive is the *known-parameter state reconstruction* of a two-compartment linear fitness–fatigue model as its decay constants approach each other?

For `x=[F,D]^T`, `A=diag(-1/τ_F,-1/τ_D)`, `C=[1,-1]`, define the two-row observability matrix `O=[C; CA]`. Its determinant is `1/τ_D - 1/τ_F`. We calculate the 2-norm condition number `κ₂(O)=σ_max/σ_min` by SVD, with `τ_F=42 days` and candidate `τ_D` values. This is a synthetic **linear-algebra diagnostic**, not parameter identification or evidence of real athlete response.

| τ_F (days) | τ_D (days) | σ_min(O) | κ₂(O) |
| ---: | ---: | ---: | ---: |
| 42 | 7 | 0.08388758 | 16.9171 |
| 42 | 20 | 0.01850686 | 76.4677 |
| 42 | 40 | 0.000841543 | 1681.0006 |
| 42 | 42 | 0 (analytically) | ∞ (analytically) |

For the last row, floating-point SVD returned approximately `7.69e-19` and an apparent condition number `1.84e18`; the exact matrix has rank one, so report the **analytical** singularity rather than interpreting numerical noise. State units and observation scaling affect the condition number, so cross-model comparisons require nondimensionalization or a stated measurement-noise covariance.

### Reproduction

Using Python 3 with NumPy:

```python
import numpy as np
for tau_d in (7, 20, 40, 42):
    A = np.diag([-1 / 42, -1 / tau_d])
    C = np.array([[1., -1.]])
    O = np.vstack((C, C @ A))
    print(tau_d, np.linalg.svd(O, compute_uv=False), np.linalg.cond(O))
```

Also checked the zero-initial-state single-day stress impulse under the CTL-style daily constant-input convention: `100*(-expm1(-1/42))=2.352831334775677`; ATL with τ=7: `100*(-expm1(-1/7))=13.312210024981836`. These values are **not** the result of a literal Dirac impulse model, for which units and state jumps differ. A 60-minute Banister reference session with `HRavg=150, HRrest=50, HRmax=200` gives approximately `92.0739769746` for the published male coefficient pair and `104.7304490756` for the published female pair. These are reference calculations, not current TPL output.

## Interpretation and limitations

- Distinct time constants are necessary for this specific known-parameter state observability test. They do **not** prove that athlete-specific `k_F,k_D,τ_F,τ_D` can be estimated.
- Near-coincident time constants amplify noise in state reconstruction. A flexible two-state model can overfit even when its observability matrix has full rank.
- The experiment uses no measured performance outcome, measurement-noise model, real training input, cross-validation or parameter estimation. Therefore it makes **no** claim of superiority over one-state models.
- The next benchmark must include parameter-sensitivity Jacobian SVD and athlete-held-out predictive tests, not just `O` condition numbers.

## Incorporation into TrainPaceLab — staged architecture

### Stage 0: Current release gates (no science implementation)

Keep PR #6 as the research/specification owner. Preserve existing workload display behavior until G0–G3 and independent review clear. Do not merge Odysseus gitlink removal without verified original-Mac restoration. No unapproved athlete-data migration or model recalculation.

### Stage 1: Versioned inputs and transparent deterministic baseline

Create a backend-owned, typed `TrainingStressObservation` contract with immutable activity identity, UTC timestamp, IANA athlete timezone, stress **method and unit**, input completeness, source revision and explicit missingness. A canonical `LoadEstimate` includes `modelVersion`, smoothing convention, initial-condition policy, history coverage, evaluation instant and measured-vs-projected flag. Keep TRIMP and threshold-normalized proxies separate unless calibration is validated. Make dashboard, chart and coach read one versioned backend result. Migrate consumers via shadow comparison and opt-in/flagged rollout, never silently overwrite historical values.

### Stage 2: Research-only model evaluation service

A separate offline/synthetic evaluation module can implement one-state and two-state exact-discretization baselines with dimensional checks and golden fixtures. Use a synthetic performance observation channel and test the inability to identify hidden states when there are no observations. Store no private athlete telemetry in Git or CI. Model artifacts include parameter uncertainty, singular values, validation splits and data provenance.

### Stage 3: Validated personalization (only with approved data and evidence)

Use consented, appropriately governed performance observations and athlete-held-out forward-time validation. Compare persistence, one-state, two-state and hierarchical Bayesian models. Promote only if predictive skill, calibration, robustness and interpretability improve. Fall back to deterministic workload summaries if data are sparse or uncertainty is high.

### Stage 4: Athlete-facing integration and safe coaching

Show descriptive training load separately from model-estimated performance/readiness. Expose data coverage and uncertainty. Coach consumes a versioned decision record; LLM explains it without fabricating calculations. Proposed-plan optimization requires separately validated constraints and human review, and must never use TSB/ACWR as a direct injury probability. Mobile UI/assets work remains on the existing design queue.

## Acceptance rubric for future modeling PRs

1. Reference fixtures reproduce exact matrix exponential and stress formulas, including zero input, tiny Δ, near-equal τ, non-finite values, timezone gaps and mixed units.
2. Parameter recovery and posterior calibration demonstrated on simulated data with known truth; identifiability failures explicitly surfaced.
3. No data leakage across athletes, dates or overlapping windows; evaluate on held-out athletes and future time periods.
4. Baseline comparisons report performance error and probabilistic calibration, not just in-sample fit; complexity must improve out-of-sample value.
5. Backend/frontend parity, rollback, versioned migration and staging athlete acceptance verified after gates. No automatic production coaching promotion.

**Next atomic task:** derive a reproducible parameter-sensitivity Jacobian experiment (with noisy synthetic performance observations), compare one-state vs two-state predictive performance under different observation frequencies, and document when the two-state model is rejected. This will remain research-only until authorized.
