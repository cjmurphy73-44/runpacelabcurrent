# COMMERCIAL-FUNNEL-001: evidence-gated beta conversion (draft only)

**Status:** draft, release HOLD. No live analytics, collection, marketing claims, production access or customer tracking is authorized by this document.

## Cohort contract

The evaluator in `src/lib/betaFunnelEvidence.js` is a pure, offline-only calculator. Supply independently verified counts of **unique consenting users** from the same cohort, attribution window, and timezone. The six stages must be nested: landing visitor → signup → connected provider → first trusted persisted workout → returned in week one → paid **after** returning in week one. This final stage is not overall paid conversion and must not be labelled as such.

A person who pays before returning, signs up through another route, or returns after day seven is outside this particular nested sequence; report these paths separately rather than forcing them into the funnel. Document the deduplication method, cohort start/end, opt-in basis, definitions, source, owner and timestamp before marking `evidenceVerified: true`.

## Safety rules

- Assumptions and hypothetical counts are not real customer results. `evidenceVerified` must remain false for fixtures, guesses, unverified dashboard aggregates, or incomplete event tracking.
- Never log emails, athlete IDs, OAuth credentials, health metrics, raw workout data, or payment details to support conversion analysis.
- Suppress conversion rates where the prior stage has fewer than ten unique users. Zero denominators produce `null`, not 0%.
- Reject invalid, non-integer, negative, unsafe or increasing stage counts. A missing stage cannot be silently interpreted as zero.
- Report the denominator and stage definition alongside any rate. Never claim retention, CAC, LTV, traction or statistical significance from this calculation alone.
- Do not wire the evaluator to production or publish a funnel dashboard until privacy, consent, measurement quality, cohort boundaries and release authorization are independently approved.

## Acceptance

Five synthetic Vitest cases cover assumed vs verified rates, correct conditional denominators, suppression, impossible counts and minimum cohort protection. CI/typecheck/lint/build and browser verification remain separate gates. No data has been collected.
