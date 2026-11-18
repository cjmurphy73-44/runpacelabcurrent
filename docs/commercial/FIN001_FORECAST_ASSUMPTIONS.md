# FIN-001: assumption-only commercial forecast (draft)
This is a **scenario calculator**, not a statement of TrainPaceLab sales, Stripe fees, costs, cash or runway. It reads **no accounts, Stripe API, athlete data or credentials**, and never writes to production.

Run: `node --test scripts/commercial/forecast.test.mjs`.

## Required inputs (all hypothetical until independently verified)
- `startingCustomers`: expected paid subscribers at the start of a month.
- `newCustomers`: new paid subscribers in that month, assumed billed for the entire month.
- `monthlyChurn`: expected fraction of starting customers lost each month, in [0,1].
- `monthlyPriceAud`: assumed average monthly recognized revenue per paid customer, **not** an assertion of current Stripe price, GST handling or plan mix.
- `feeRate`, `feeFixedAud`: placeholder transaction fees. Actual Stripe fees, GST, refunds and payout timing require independent confirmation.
- `variableCostAud`: assumed monthly per-customer hosting/AI/support costs.
- `fixedCostAud`: assumed monthly fixed operating costs.
- `startingCashAud`: hypothetical available cash, **not** actual bank balance.
- `months`: integer horizon 1–120.

## Definitions and limitations
Retained subscribers = starting subscribers × (1 − churn). Ending subscribers = retained + new. Gross revenue = ending subscribers × monthly price. Fees = ending subscribers × (price × fee rate + fixed fee). Contribution = gross revenue − fees − variable costs. Modeled net cash flow = contribution − fixed costs. The first negative month is **scenario depletion**, not actual runway. Cohorts are expected values, so fractional subscribers are valid model outputs.

**Excluded:** GST, taxes, annual-plan cash timing, refunds, chargebacks, trial conversion, tier migration, acquisition spend, financing, depreciation and payment delays. Do not use for investor statements, actual budgeting or billing decisions without verified source inputs and a reviewed cash-flow model. No actual CAC/LTV is available. A theoretical LTV must not be represented as measured retention.

Acceptance: deterministic positive/negative cases, zero-customer and full-churn scenarios, finite-input validation, no mutation, no network or secrets, independent CI and review. This file is a draft only; release HOLD remains in effect.
