# Sparse-observation parameter-identifiability experiment — 9 November 2026

**Scope:** one research-only numerical experiment; no application code, athlete data, staging or production change. Model and integration architecture in `IDENTIFIABILITY_EXPERIMENT_AND_INTEGRATION.md`. G0–G3 and independent review remain prerequisites for implementation.

## Experimental question

Can a four-parameter, two-state impulse-response model recover true physiological parameters when performance outcomes are sparse, even if it fits the observed outcomes?

Simulate 180 days of nonnegative daily stress `u_t` drawn from `max(0, Normal(55,20))` with every seventh day set to zero. Generate latent performance using

`F_(t+1)=exp(-1/τ_F)F_t+k_F u_t`
`D_(t+1)=exp(-1/τ_D)D_t+k_D u_t`
`y_t=F_t-D_t+ε_t`, `ε_t~Normal(0,2²)`.

True parameters: `τ_F=42 days, τ_D=7 days, k_F=0.025, k_D=0.045`. Fit by bounded nonlinear least squares with multiple random starts, using every 7th or 28th performance observation. Seed `20261109` for NumPy default_rng. **These are synthetic values and a mathematical toy model**, not calibrated TPL athlete parameters. The recursion uses a daily *impulse-dose* convention, not the continuous constant-rate input normalization.

## One-seed numerical results

| Parameter | Truth | Every 7 days (26 observations) | Every 28 days (7 observations) |
| --- | ---: | ---: | ---: |
| τ_F days | 42 | 47.456 | 45.612 |
| τ_D days | 7 | 3.973 | 1.111 |
| k_F | 0.025 | 0.020 | 0.019 |
| k_D | 0.045 | 0.050 | 0.172 |
| Training residual sum of squares | — | 101.19 | 19.54 |

**Do not compare residual sums of squares across observation frequencies**: the two fits have different numbers of observations. The 28-day fit recovers a dramatically different fatigue timescale and gain despite minimizing error on its seven measured performance points. This does not establish predictive superiority or inferiority: there is no held-out evaluation in this slice.

At the fitted solutions, the smallest unscaled parameter-Jacobian singular values were about 0.3355 (weekly) and 0.1538 (28-day), with largest about 8852 and 4376 respectively. Raw condition numbers are strongly affected by units and parameter scaling; meaningful uncertainty diagnostics should standardize parameters (e.g. log time constants and gains) and use the observation-noise covariance.

## Reproducibility script

Python 3, NumPy, SciPy; exact random draw order matters.

```python
import numpy as np
from scipy.optimize import least_squares

rng = np.random.default_rng(20261109)
T = 180
u = np.maximum(0, rng.normal(55, 20, T))
u[np.arange(T) % 7 == 0] = 0

def states(par):
    tau_f, tau_d, k_f, k_d = par
    f = d = 0.
    out = []
    for v in u:
        f = np.exp(-1 / tau_f) * f + k_f * v
        d = np.exp(-1 / tau_d) * d + k_d * v
        out.append(f - d)
    return np.array(out)

truth = [42, 7, .025, .045]
y = states(truth) + rng.normal(0, 2, T)
for spacing in (7, 28):
    ix = np.arange(0, T, spacing)
    def residual(p):
        return states(p)[ix] - y[ix]
    fits = []
    for _ in range(20):
        x0 = [rng.uniform(15, 80), rng.uniform(2, 25),
              rng.uniform(.005, .07), rng.uniform(.005, .09)]
        fit = least_squares(
            residual, x0,
            bounds=([5, 1, 0, 0], [150, 80, .2, .2]),
            max_nfev=250
        )
        fits.append((np.sum(fit.fun ** 2), fit.x,
                     np.linalg.svd(fit.jac, compute_uv=False)))
    fits.sort(key=lambda x: x[0])
    print(spacing, len(ix), fits[0])
```

## Interpretation and limitations

- One random seed, one 180-day history, one stress pattern, one observation-noise level and only two observation schedules. Not a generalizable conclusion about athlete parameter recovery.
- Baseline performance `p0`, initial state, nonstationary training, observation error correlation and data missing-not-at-random were held fixed/omitted, making the problem *easier* than real use.
- Random starts help reveal local optima but do not guarantee global optimization or structural identifiability.
- The 28-day fit places `τ_D` near the lower allowed bound; this is a warning about weak information, not evidence of an actual one-day fatigue process.
- The experiment does not compare one-state and two-state models on future performance; avoid treating the fitted residual as an acceptance metric.

## Incorporation into TPL

1. **Baseline first:** keep deterministic, versioned workload calculations separate from inferred performance. Do not call latent `F` or `D` observed fitness/recovery.
2. **Research evaluator:** build an isolated, synthetic-only benchmark runner that sweeps noise, observation frequency, missingness, history length and parameter separations. Fit persistence, one-state and two-state baselines; use athlete-held-out/forward-time splits when approved real data are available.
3. **Diagnostics:** use scaled sensitivity Jacobians, profile likelihood/posterior intervals, parameter-bound flags, proper predictive scores and interval coverage. Reject personalized estimates if practically unidentifiable.
4. **Athlete experience:** if a model is promoted after review, display a versioned performance forecast and uncertainty separately from CTL/ATL. When evidence is insufficient, show “insufficient performance observations” and fall back to the descriptive baseline.
5. **Safety and release:** no direct model-generated injury probability, no autonomous prescription from a weak fit, and no new science implementation before G0–G3 and independent review.

## Next atomic research task

Run a **multi-seed Monte Carlo** benchmark with predeclared metrics (held-out MAE, parameter coverage, interval calibration, bound-hit rate) across weekly/monthly performance schedules; include one-state baseline and parameter scaling. Commit the reproducible benchmark and summary without private athlete data.
