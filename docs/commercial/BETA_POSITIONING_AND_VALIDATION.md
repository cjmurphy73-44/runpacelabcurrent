# COM-001: evidence-gated beta positioning and customer discovery

**Status:** Draft, not approved marketing copy. **Baseline:** 2026-11-16. **Scope:** Australian-first endurance athletes and coaches as *hypotheses*, not established customer segments. No production data, personal information, financial accounts, scraping, outreach or advertising required.

## Positioning hypothesis

TrainPaceLab is a device-neutral training intelligence workspace for endurance athletes who want to understand what their *verified* recordings support, and what is only estimated. Explain load, readiness and training changes with reproducible provenance. Do not promise injury prevention, medical diagnosis, guaranteed race improvements, complete Garmin/COROS integration, or live coaching until verified end to end.

**Proof before promotion:** original FIT or equivalent stream, provider identity, ingest status, time coverage, measured-vs-estimated load and visible recovery on errors. A successful GitHub check is not proof that the published app or device integration works. External beta invitations remain blocked by the canonical beta readiness gates and release provenance.

## Three interview personas (unvalidated)

| Hypothesis | Job to be done | Risk to test | Candidate evidence |
|---|---|---|---|
| Self-coached runner training for a race | Know whether today's training and recovery justify changing tomorrow's plan | Existing watch app already answers it sufficiently | Can explain source and uncertainty for a workout without help |
| Multisport athlete using multiple devices | Reconcile sessions without double counting or false precision | Cross-device sync and ownership do not work reliably | Distinct sessions reconcile; retry creates no duplicate |
| Small endurance coach managing a roster | See athlete readiness and hold/release a plan safely | Coach access, privacy and plan controls are unverified | Two-account negative authorization and hold-state acceptance |

Do not claim these are actual users or customers. Recruiting, interviewing and storing personal responses requires a separate consent/privacy-approved plan.

## Five synthetic-first validation tasks

1. **Clarity test:** Show a fixture with a complete recording and one summary-only activity. Pass only if the interface distinguishes measured from estimated load and does not fabricate zones.
2. **Recovery test:** Simulate failed transfer, uncertain ingest and successful persisted ingest. Pass only if the message distinguishes retry-safe from check-history-first, and success requires a persisted identifier.
3. **Privacy test:** In an isolated tenant, user A cannot read user B's workout or coach messages. No production account tests.
4. **Value comprehension:** Present an anonymized static prototype to a consenting participant, ask what changed in their next training decision, and record verbatim qualitative feedback without asserting conversion.
5. **Pricing comprehension:** Present proposed tiers as *draft pricing* with a clear statement of what is actually available. Ask participants to identify included features, restrictions and billing timing. Never enable checkout to run this test.

## Interview script (for later separately approved use)

- Tell me about the last time your training data was confusing or incomplete.
- Which data source did you trust, and why?
- What would you do if a workout was imported but its detailed recording was missing?
- What information would change tomorrow's session? What would you ignore?
- What would make you stop using this product?
- Which capability, if proven reliable, would justify a paid subscription? Why?

Avoid leading questions like "Would you pay $19?" and do not treat stated willingness to pay as actual revenue.

## Ethical funnel and measurement contract

**Draft funnel:** rights-cleared real-scenery landing page → truthful feature explanation → optional beta interest → consented onboarding → first verified workout → comprehension of provenance → safe plan review → test-mode-only checkout acceptance → separately approved live launch.

Metrics are **definitions, not observed values**:
- Landing-to-interest rate = consented interest submissions / eligible landing sessions.
- Verified first-workout rate = new eligible accounts with at least one persisted workout and verified stream / new eligible accounts.
- Seven-day return rate = eligible first-workout accounts active on day 7 / eligible first-workout accounts whose day 7 has elapsed.
- Checkout completion = successful test-mode checkout sessions / started test-mode checkout sessions. Never mix test-mode with actual revenue.
- Refund, churn, CAC, LTV and runway: **UNKNOWN** until authenticated, permissioned source data and documented accounting definitions are available.

Denominators, time windows, bot exclusion, event deduplication, consent and retention must be documented before a dashboard makes claims. No fabricated sample sizes, market shares, growth, prices or customer quotes.

## Release and content gates

- [ ] Published SHA, Base44 checkpoint and Vercel asset provenance verified together
- [ ] Device original-recording acceptance and missing-stream UX verified
- [ ] Isolated two-account authorization and webhook/idempotency evidence
- [ ] Stripe test-mode lifecycle, entitlement and refund/cancellation messaging verified; live billing separately approved
- [ ] Accessible mobile onboarding and account deletion validated
- [ ] Brand photography licensed, anonymous where feasible, and image rights recorded
- [ ] Landing copy and canonical metadata reviewed for unsupported claims
- [ ] Consent, analytics retention and support escalation policy reviewed
- [ ] Customer interviews and external beta invitations separately authorized

**Decision rule:** Until all required gates pass, prepare copy and synthetic tests only. Do not publish, invite, charge, scrape, spend or claim commercial traction.

**Next:** link each gate to current exact-head evidence in the release tracker; then obtain isolated runtime acceptance before inviting external testers.
