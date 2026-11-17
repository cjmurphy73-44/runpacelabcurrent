# COMMERCIAL-UE-001: Internal unit-economics scenarios

**Status:** Draft planning model only. **Release:** HOLD. No real revenue, customer counts, churn, CAC, cost ledger, or market traction has been observed or inferred.

`src/lib/commercialScenario.js` is a deterministic pure calculator, not an application payment or billing integration. All inputs must be supplied explicitly in AUD; there are no hidden defaults or network calls.

## Illustrative assumptions, NOT measured TrainPaceLab results

| Input | Hypothetical value | Validation needed |
|---|---:|---|
| Paying customers | 100 | Stripe reconciled count, only after authorized access |
| Monthly price per customer | A$19 | Confirm active tier and discounts, taxes, refunds |
| Monthly variable cost per customer | A$4 | Hosting, API usage, support, processor fees |
| Monthly churn | 5% | Mature cohorts, consistent denominator |
| CAC | A$60 | Attributable acquisition spend and acquired customers |
| Fixed monthly operating costs | A$1,200 | Approved budget and real expenses |

**Arithmetic, not forecast:** revenue A$1,900/month; contribution A$1,500/month; operating result A$300/month before omitted expenses and taxes; contribution/customer A$15; break-even 80 customers at the assumed cost structure; simplified churn-based LTV A$300 contribution; LTV/CAC 5.0x. These are illustrative scenario outputs only. No growth rate, market size, runway or actual margin is asserted.

Formulae: contribution/customer = price - variable cost; monthly operating result = paying customers × contribution/customer - fixed costs; break-even = ceil(fixed costs / contribution/customer); simplified stationary-churn LTV = contribution/customer / monthly churn; LTV/CAC = LTV / CAC. Zero churn or zero CAC yields **unknown** rather than infinity; zero contribution yields unknown break-even. The model rejects invalid, negative and nonfinite inputs. It is deliberately not a discounted cash flow, cohort model, tax model or GAAP accounting system.

**Acceptance:** run `npx vitest run src/lib/__tests__/commercialScenario.test.js` in an isolated checkout, then `npm run typecheck && npm run test:ci && npm run lint && npm run build`, inspect exact-head CI, and review source-map guard. Do not put hypothetical values on the landing page or pricing UI. Before a real financial forecast, obtain permission for approved, anonymized aggregate data and add taxes, payment processing, refunds, tier mix, annual discounts, retention cohorts and cash timing. No sensitive finance access authorized by this document.
