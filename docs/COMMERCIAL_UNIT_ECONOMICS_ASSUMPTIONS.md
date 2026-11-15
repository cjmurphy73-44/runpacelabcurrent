# Commercial launch: scenario-only unit economics

This model is a planning tool, not financial reporting. No traffic, subscriptions, revenue, payment fees, churn, advertising spend, or CAC have been observed or verified by this feature. All values supplied to `evaluateUnitEconomics` are explicit **assumptions** in AUD, with monthly price and costs expressed per paying customer.

The calculator estimates transaction fees, contribution after variable costs, contribution margin, geometric expected customer lifetime (1 / assumed monthly churn), lifetime contribution, acquisition payback and LTV:CAC. It does **not** include tax, refunds, GST treatment, fixed overhead, discounts, failed payments, infrastructure step functions or cohort retention curves. Treat those as separate inputs in a future reviewed financial model.

A zero assumed churn rate cannot support a finite expected lifetime; the calculator returns `null` for lifetime and LTV instead of an invented number. Loss-making contribution returns `null` for payback and lifetime contribution. A zero CAC produces an undefined ratio rather than infinity.

The automated tests use a **fictional** AUD 19/month example with hypothetical 2% + AUD 0.30 processing fees, AUD 3 variable costs, 5% monthly churn and AUD 30 acquisition cost. These are **not** measured TrainPaceLab figures or verified Stripe pricing.

Acceptance: Vitest golden arithmetic, zero-churn, loss-making, zero-CAC, invalid/NaN/infinite inputs. No Stripe calls, no billing writes, no customer data, no UI claim and no publication. This PR is source-only until checks and release provenance are independently verified.
