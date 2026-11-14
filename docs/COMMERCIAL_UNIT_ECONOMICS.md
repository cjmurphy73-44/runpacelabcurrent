# Commercial launch: assumption-only unit economics (draft)

This model is **not** a forecast of observed customers, conversion, revenue, CAC or runway. No customer, Stripe or bank records were consulted. Enter independently justified values before using results in a business decision. AUD inputs and outputs only.

## Inputs and definitions

| Input | Meaning | Evidence required |
| --- | --- | --- |
| monthlyPriceAud | Collected monthly subscription price per paying customer, before tax treatment | Approved pricing and real invoice reconciliation |
| monthlyVariableCostAud | Monthly service/support/payment processing cost per active paying customer | Vendor invoices and cost attribution |
| monthlyChurnRate | Assumed fraction of paying subscribers leaving per month (0 to 1) | Cohort retention evidence |
| acquisitionCostAud | Fully loaded acquisition spend per new paying subscriber | Attributed channel spend and verified paid conversions |
| monthlyFixedCostAud | Monthly recurring fixed operating outlay | Approved budget, invoices |
| startingCashAud | Available unrestricted operating cash | Owner-approved financial statements |

The calculator in `src/lib/commercialUnitEconomics.js` returns monthly contribution = price - variable cost; simple churn-model lifetime contribution = monthly contribution / churn; LTV:CAC; CAC payback = CAC / contribution; fixed-cost break-even subscribers = ceil(fixed cost / contribution); and **no-revenue** cash runway = starting cash / fixed costs.

When churn is zero, LTV is unknown, not infinite. When fixed costs are zero, no-revenue runway is unknown. A nonpositive margin is an invalid case, not a positive business outlook. All values are **assumptions** until evidence is entered; the function deliberately has no default numbers.

## Limitations and release controls

This is a simplified constant-rate scenario, not a discounted cohort model. It excludes tax/GST, refunds, payment failures, annual plan timing, founder compensation, one-off setup costs, acquisition channel variance, cohort aging, cash timing, capital expenditure and working capital. It must not be represented as a financial forecast or used to justify spending without additional review.

**Before launch:** verify Stripe test-mode lifecycle and entitlements, confirm advertised pricing/packaging against checkout, establish privacy-respecting analytics and support workflows, and secure explicit approval before enabling billing or paid campaigns. No live billing or external publication is authorized by this draft.

## Acceptance

Synthetic unit tests cover arithmetic, zero churn, zero fixed costs, zero CAC, invalid inputs and nonpositive contribution. No live financial information is accessed. This PR only adds an isolated calculator, tests and planning documentation.
