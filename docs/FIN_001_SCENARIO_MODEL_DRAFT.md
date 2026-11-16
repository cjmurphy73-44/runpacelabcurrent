# FIN-001: Input-driven commercial scenario model (draft)

**Status:** planning tool only. No actual customer counts, prices, Stripe charges, costs, cash balances, runway or traction have been verified. No live financial data is accessed. All inputs are hypothetical until separately sourced and dated.

Run offline with `node --test scripts/finScenarioModel.test.mjs`. Import `forecastMonths` from `scripts/finScenarioModel.mjs` and supply every input explicitly. No defaults are provided, deliberately.

| Input (AUD where applicable) | Meaning | Evidence status |
|---|---|---|
| startingPaid | Paying subscriptions at month start | Unknown; owner must supply |
| newPaid | Newly acquired paid subscriptions per month | Assumption; do not label as forecast fact |
| monthlyChurnRate | Monthly paid subscriber churn, 0–1 | Assumption; not observed |
| priceAud | Realised monthly revenue per average paid subscription, net of discounts/refunds if modelled | Assumption; verify plan mix and Stripe |
| variableCostAud | Monthly variable cost per average paid subscriber, including payment fees, API and AI costs | Unknown; validate bills and contracts |
| fixedCostAud | Monthly fixed operating expense | Unknown; validate budget |
| startingCashAud | Available operating cash at month start | Sensitive; supply locally only, never commit |

Model: ending subscribers = starting subscribers × (1 − churn) + new paid; average paid = (starting + ending) / 2; monthly revenue = average paid × realised price; contribution = revenue − average paid × variable cost; cash flow = contribution − fixed cost; ending cash = starting cash + cash flow. Repeated months hold acquisition/churn/price/cost assumptions constant, **not** a prediction of growth. Fractional subscribers are expected-value arithmetic, not literal account counts.

Limitations: no taxes, GST, annual billing recognition, chargebacks, refunds, plan-specific tier mix, payment timing, seasonality, cohort retention, founder salary, capital expenditure, or one-off launch expenses. CAC/LTV and runway are **not calculated** without defensible acquisition costs, cohort retention and cash-flow assumptions. A negative ending cash balance signals a scenario funding gap, not a verified runway date.

Acceptance: offline zero scenario produces zero revenue; negative/nonfinite inputs and churn >100% fail closed; two-month cash rolls forward; exact-head Node test and repository npm CI/build must be independently run before merge. Keep release HOLD; do not publish pricing, activate billing or represent these scenarios as observed business performance.
