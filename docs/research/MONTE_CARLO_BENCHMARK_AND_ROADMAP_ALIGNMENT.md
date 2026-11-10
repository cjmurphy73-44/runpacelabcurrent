# Monte Carlo modeling benchmark and whole-product roadmap alignment — 9 November 2026

**Status:** bounded synthetic research and planning only. No app code, athlete data, staging, production or protected branch merge. Science remains blocked by G0–G3 and independent review. This extends `SPARSE_PERFORMANCE_IDENTIFIABILITY_EXPERIMENT.md`.

## Experiment: 20 seeds × two observation schedules

For each seed 400..419, simulate 210 days of nonnegative daily stimulus `u=max(0,Normal(55,20))` with every seventh day zero. Truth: `F[t]=exp(-1/42)F[t-1]+0.025u[t]`, `D[t]=exp(-1/7)D[t-1]+0.045u[t]`; observed performance `y=F-D+Normal(0,2)`. Fit four unknown positive parameters by bounded nonlinear least squares with four randomized starts. Train on days 0..139 observed at every 7 or 28 days, and evaluate **future** days 140..209 every seven days. Baseline predicts the training-observation mean, not a tuned alternative model. All numbers are synthetic arbitrary performance units.

| Observation schedule | Seeds | Two-state held-out MAE mean | Constant baseline MAE mean | Median fitted τ_D days |
| --- | ---: | ---: | ---: | ---: |
| Every 7 days | 20 | 2.495 | 13.550 | 8.709 |
| Every 28 days | 20 | 3.548 | 15.907 | 7.297 |

Results are a limited **oracle-family recovery check**: the generator and fitted model share the same functional form and training stimulus is fully known, while the baseline is deliberately weak. This is **not** evidence that a two-state model outperforms one-state, autoregressive, trend, pace-based or hierarchical alternatives on real athletes. The fatigue time constant remains variable across seeds, and neither confidence-interval coverage nor formal parameter-identifiability metrics were assessed here. The holdout continues the same generated training process; real athlete behavioral changes, missing workouts, uncertain stress units and performance-measurement confounders are absent.

## Reproduction specification

Python 3, NumPy and SciPy, seeded per synthetic subject with `np.random.default_rng(seed+400)` for `seed in range(20)`. For each observation schedule, reinitialize each subject RNG; generate training and performance noise before randomized fit starts. Use `least_squares` with parameter order `[τ_F,τ_D,k_F,k_D]`, bounds `[5,1,0,0]` to `[150,80,.2,.2]`, four starts sampled from `τ_F∈[15,70],τ_D∈[2,20],k_F∈[.01,.05],k_D∈[.02,.08]`, `max_nfev=100`. Choose smallest training residual sum of squares. Evaluate held-out MAE on `np.arange(140,210,7)`; constant baseline is `mean(y[train_indices])`. Numerical summaries rounded to three decimals. No confidence intervals or statistical significance are claimed.

## What to test next (separate atomic task)

Implement research-only one-state and autoregressive baselines, use misspecified generators (nonlinear saturation, HR measurement error, incomplete sync, changed training), more seeds, proper probabilistic calibration and parameter-Jacobian SVD with dimensionless scaling. Predeclare a promotion rule that requires improvement on independently held-out athletes, stability under missingness and an explicit uncertainty/fallback contract. No athlete-facing personalization before this evidence.

## Incorporation without losing the main development roadmap

**Current priority remains G0**, not science release. The roadmap/backlog already includes these product tracks; this document adds research dependencies rather than creating a competing implementation queue.

| Existing roadmap track | Current dependency / next safe planning consideration |
| --- | --- |
| G0 CI, staging, release infrastructure | Independent review and exact-head CI, verified staging source/identity, synthetic FIT-to-dashboard journey; preserve independent Odysseus project before any gitlink-removal merge |
| G1 security/ownership | Fail-closed routes, RLS and coach/athlete isolation; no performance telemetry or model outputs bypass authorization |
| G2 billing | Stripe sandbox, webhook idempotency and accurate subscription access; model features must not create billing bypass |
| G3 data/ingestion | Garmin/COROS reliability, activity deduplication, missing streams, timestamps/timezones, persistence and provenance; prerequisite for trustworthy math |
| G4 physiology/coaching | Golden reference formulas, versioned deterministic backend load, scientific review, uncertainty-aware optional performance model, human override |
| G5 deletion/privacy | Complete athlete-scoped removal, including any future model inputs, parameter estimates, forecast caches and derived records |
| Athlete onboarding and UX | First useful dashboard, transparent missing-data states, manual entry, mobile/iPad navigation, accessibility, actionable sync feedback |
| Brand/assets/imagery | Existing ASSET-001..008 queue: logo/wordmark, favicon/PWA, licensed imagery, synthetic screenshots, responsive optimization and accessibility |
| QA/operations/release | Exact candidate test manifest, provider-specific synthetic acceptance, monitoring/recovery, small beta and controlled release decision |
| Future hosting independence | Base44 dependency inventory and adapter contracts, not an unapproved rewrite; model engine should remain backend-agnostic where practical |

### Proposed engineering interface (research design only)

`WorkoutObservation -> ValidatedStressRecord -> DeterministicLoadSeries -> OptionalPerformanceInference -> VersionedCoachDecision -> AthleteUI`.

The optional inference service must consume separately measured performance observations and return `model_version`, uncertainty, observation count, diagnostics, validity and a fallback reason. No invented performance outcome, injury probability or auto-prescription from an unstable fit. Store only approved, scoped derived records; include deletion and consent from the start.

## Run result and next atomic action

This run contributes a synthetic benchmark and a roadmap alignment document to existing PR #6. The previous research files and PR #9 source characterization remain separate; CI green on older commits is not evidence for this commit. G0 and independent review are still blocking. **Next atomic task:** implement a research-only comparison with a one-state baseline under a misspecified generator and record its reproducible results. Separately the highest-priority release task remains resolving the supported staging metadata isolation and Odysseus preservation blockers; do not silently jump gates.
