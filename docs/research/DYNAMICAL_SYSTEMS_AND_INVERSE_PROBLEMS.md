# Differential equations, linear algebra and inverse problems for TPL — 9 November 2026

**Status:** mathematical research/design only, no production model approval. G0–G3 gates, independent science review and Odysseus preservation remain prerequisites. This extends `ADVANCED_MATHEMATICAL_MODELING.md` and does not modify algorithms.

## 1. Continuous-time dynamical systems and exact discretization

Candidate latent state `x=[F,D]^T`, with `dx/dt=A x+B u(t)`, `A=diag(-1/τ_F,-1/τ_D)`, `B=[k_F,k_D]^T`, and measured performance `y=p0+[1,-1]x+ε`.

The variation-of-constants solution is `x(t+Δ)=exp(AΔ)x(t)+∫_0^Δ exp(A(Δ-s))B u(t+s)ds`. For a constant rate `u` over the interval, the exact input matrix is `Γ(Δ)=A^{-1}(exp(AΔ)-I)B`, provided A is invertible. Componentwise `x_i(t+Δ)=exp(-Δ/τ_i)x_i(t)+k_i τ_i(1-exp(-Δ/τ_i))u`. A discrete impulse of dose `q` instead produces a jump `x(t^+)=x(t^-)+Bq`; **impulse dose and constant daily rate are different units and must not be conflated**. CTL-style `L_next=e^{-Δ/τ}L_prev+(1-e^{-Δ/τ})u` corresponds to a particular gain/input normalization, not arbitrary `k u`.

For irregular sampling, use exact `Φ(Δ)=exp(AΔ)` and `Γ(Δ)` rather than a fixed daily Euler step. For stable decay, all eigenvalues of A have negative real part. A two-state linear model is a candidate workload-response abstraction, not proof that physiological adaptation has two independent compartments.

## 2. Observability, controllability and parameter identifiability

With `C=[1,-1]`, `O=[C;CA]=[[1,-1],[-1/τ_F,1/τ_D]]`, `det(O)=1/τ_D-1/τ_F`. Known-parameter state observability requires distinct decay rates; when they are close, the matrix becomes ill-conditioned and noise amplification is substantial.

Controllability matrix `K=[B,AB]` has determinant `k_F k_D(1/τ_F-1/τ_D)`; if either gain vanishes or rates coincide, rank is lost. Controllability is a mathematical property of the linear model, **not** evidence that a coach can safely manipulate human physiology.

Even with full-rank observability, unknown `τ,k,p0,x0` may be practically nonidentifiable. Diagnose using sensitivity Jacobian `J_ij=∂ŷ_i/∂θ_j`, singular values, profile likelihood, Fisher information `J^TΣ^{-1}J`, posterior correlations and simulation-based calibration. Require independently measured performance observations, not self-generated load scores.

## 3. Convolution, Green's functions and frequency-domain insight

For an impulse-response system, `P(t)-P0 = ∫_0^∞ h(s)u(t-s)ds`, with `h(s)=k_F exp(-s/τ_F)-k_D exp(-s/τ_D)` for impulse-dose gains. Laplace transform `H(z)=k_F/(z+1/τ_F)-k_D/(z+1/τ_D)` reveals distinct time scales and possible cancellation. Slow variation can make parameter identification weak; training inputs with sufficient variation improve mathematical excitation but must never be engineered at the expense of athlete safety. Evaluate whether a one-kernel or two-kernel model earns predictive improvement.

## 4. Differential calculus and nonlinear extensions

Candidate saturation model: `dF/dt=-F/τ_F+k_F g(u)`, where `g(u)=u/(K+u)` for nonnegative u. The marginal adaptation gain is `g'(u)=K/(K+u)^2`, and `g''(u)=-2K/(K+u)^3`, encoding diminishing returns **as a hypothesis requiring athlete validation**, not an established law.

For a nonlinear observation `y=h(x,θ)+ε`, use Jacobians and Hessians to study local sensitivity, curvature and uncertainty. Distinguish local linearization (EKF) from posterior inference (particle filtering or MCMC); nonlinear models add flexibility but worsen identifiability with sparse data.

## 5. Stochastic differential equations and filtering

Candidate SDE `dx=A x dt+B u(t)dt+G dW_t`; measurements `y_k=Cx(t_k)+ε_k`. Conditional on fixed parameters, the exact process-noise covariance is `Q_Δ=∫_0^Δ exp(As)GG^T exp(A^T s)ds`. This matters for irregular sessions and honest confidence intervals. Kalman filtering and Rauch–Tung–Striebel smoothing can be compared with a deterministic baseline. Missing performance observations imply prediction-only propagation with expanding uncertainty, not a fabricated performance measurement.

## 6. Optimal control and robust optimization

Only after validated prediction: finite-horizon constrained optimization of planned stimulus. A generic objective is `min_u E[(y_goal-y_target)^2]+λΣ||Δu||²+γ Var(y_goal)`, subject to athlete availability and coach-approved limits. Use model predictive control to replan with new observations. Never encode unvalidated injury probabilities from TSB or acute:chronic workload ratios as chance constraints. Low confidence or symptoms trigger a human-review/hold pathway.

## 7. Numerical mathematics and reproducibility

- Verify matrix exponential against the scalar closed form and against a convergent high-precision numerical integrator for synthetic piecewise-constant input.
- Check limiting cases: `Δ→0`, `τ→∞`, zero input, and identical decay rates (observability degeneracy).
- Check dimension consistency: hours vs days, impulse dose vs rate, stress proxy vs TRIMP arbitrary units.
- Separate finite-precision calculation from display rounding; test numerical stability for `1-exp(-Δ/τ)` using `-expm1(-Δ/τ)` when Δ/τ is small.
- Verify nonnegative latent states for nonnegative input and positive gains in the chosen simple model; this is a numerical invariant, not a clinical claim.
- Cross-validate against simple persistence and one-state models, using athlete-held-out and forward-time splits. Measure proper probabilistic scores and calibration, not only training fit.

## Research and implementation decision

**Recommended sequence:** (1) derive exact discretization and golden fixtures; (2) build synthetic identifiability and conditioning diagnostics; (3) select a measurable performance outcome; (4) benchmark one-state vs two-state and optional nonlinear models; (5) only then consider personalized Bayesian inference and constrained planning. No new coaching algorithms until G0–G3, review and validated data access.

**Core caution:** mathematical observability with known parameters does not imply physiological identifiability, and mathematical optimality does not imply safe training advice.
