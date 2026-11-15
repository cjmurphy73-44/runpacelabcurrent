# FIN-001: Pre-launch unit economics and runway decision model

**Status:** Draft for owner review. **Evidence level:** formulas and illustrative inputs only. No observed revenue, subscriber count, acquisition costs, cash balance, provider pricing, or payment fees have been verified. Do not treat this document as an operating forecast or publish its illustrative numbers.

## Ground rules

- Source of truth for prices is the active Stripe catalogue and current product entitlement contract, not historical roadmaps. Historical documents disagree about tiers (for example, the beta readiness checklist describes A$9 Pro and Coach Pro coming soon); therefore **price, GST treatment and plan availability are verification gates**, not assumptions to present as current offers.
- Model AUD monthly, with **all revenue and costs consistently GST-exclusive**. If a customer-facing price includes GST, derive net revenue from the applicable tax treatment before calculating margin; confirm tax advice before launch.
- Separate paid subscriptions from beta users, free users, trial users and access-code users. None of the latter are paid customers by default.
- Do not count unverified Garmin/COROS integration or premium capabilities as sellable features.
- No actual Stripe, bank, customer, production or analytics data is accessed by this worksheet.

## Inputs (all TBD until independently evidenced)

| Symbol | Input | Source / evidence required |
|---|---|---|
| P | Realized monthly subscription revenue per paying account, net of discounts, refunds and GST | Stripe test-mode contract first; production reporting only with separate approval |
| N0 | Starting paying accounts | Verified billing records, not registered users |
| A | New paying accounts per month | Observed conversions; forecast scenario only before launch |
| c | Monthly paying-account churn fraction, 0–1 | Observed cancellations / beginning active paying accounts |
| f | Variable payment processing fee fraction | Verified Stripe Australian contract and payment mix |
| t | Variable payment transaction fee per successful charge (AUD) | Verified Stripe contract |
| v | Other variable servicing cost per paying account/month (AUD) | Metered AI, provider, storage, support and messaging estimates with measured usage |
| F | Fixed monthly operating cost (AUD) | Hosting, domains, accounting, software, legal, insurance and minimum subscriptions |
| M | Monthly discretionary marketing budget (AUD) | Owner-approved only; default **0** until approved |
| C | Available cash runway balance (AUD) | Owner-provided confidential aggregate, not bank credentials |

## Reproducible calculation contract

For month `m`, beginning paid accounts `N[m]`:
- `retained[m] = N[m] * (1 - c)`; `ending[m] = retained[m] + A[m]`.
- `average_paid[m] = (N[m] + ending[m]) / 2` is a **simplifying approximation**; use actual billed invoices for financial reporting.
- `net_revenue[m] = average_paid[m] * P`.
- `payment_cost[m] = average_paid[m] * (P * f + t)` assumes one charge per active paid account/month; model annual plans, failed charges, refunds and tax separately.
- `service_cost[m] = average_paid[m] * v`.
- `contribution[m] = net_revenue[m] - payment_cost[m] - service_cost[m]`.
- `operating_result[m] = contribution[m] - F - M`.
- `cash_end[m] = cash_start[m] + operating_result[m]`, **only if** cash timing, tax and capital expenditure are also accounted for; otherwise mark cash forecast incomplete.
- `contribution_per_paid = P * (1 - f) - t - v`.
- `break_even_paid = ceil((F + M) / contribution_per_paid)` only when contribution_per_paid is positive. Otherwise break-even is **not attainable** under those assumptions.
- `gross_revenue_LTV_proxy = P / c` and `contribution_LTV_proxy = contribution_per_paid / c` only when `c > 0` and steady-state assumptions hold. If churn is unknown or zero, output **N/A**, not infinity or a fabricated LTV.
- `CAC = attributable_acquisition_spend / verified_new_paying_accounts` only when denominator is positive and attribution is defined; otherwise **N/A**.
- `CAC_payback_months = CAC / contribution_per_paid` only when both are known and contribution is positive.

## Synthetic acceptance examples (not forecasts)

These numbers exist solely to make the formulas independently checkable.

**Example A, one synthetic paid account:** `P=10, f=0.03, t=0.30, v=1.40` implies contribution per paid account = `10 - 0.30 - 0.30 - 1.40 = A$8.00`. With `F=80, M=0`, break-even = `ceil(80/8)=10` average paid accounts. These are invented fixture values, not TrainPaceLab pricing or costs.

**Example B, nonviable contribution:** `P=5, f=0.10, t=0.50, v=5` gives `5 - 0.50 - 0.50 - 5 = -A$1.00`. Break-even and CAC payback must report **N/A**, not a negative subscriber count.

**Example C, missing churn or customers:** If `c` is unknown, LTV is **N/A**. If no paying accounts have been observed, CAC is **N/A** regardless of marketing spend.

## Launch evidence gates

1. Reconcile exact live and test-mode Stripe price IDs, plan names, tax handling, entitlements and refund/cancellation behavior. No charges or credential access for this documentation task.
2. Validate checkout, webhook idempotency, past_due/cancelled revocation and portal behavior with synthetic test-mode events before billing activation.
3. Inventory fixed and per-athlete variable costs using invoices or measured synthetic usage, with date, units, provider and currency.
4. Establish consent-based privacy-preserving funnel events: landing, signup, verified first session, coach action, trial, paid conversion, churn. Avoid sensitive workout contents in analytics.
5. Record actual cohort retention, refunds and support costs before estimating CAC/LTV or claiming profitability.
6. Obtain owner sign-off for budget, legal/tax assumptions, product claims and release. **Release HOLD** until independent product, billing and deployment acceptance.

**Related:** COM-001 issue #62; `MVP_ROADMAP.md`; `docs/MVP_ATOMIC_BACKLOG.md`; `src/BETA_READINESS_ROADMAP.md`. This document does not replace any existing release gate.
