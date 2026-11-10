# SaaS operating guidance for TrainPaceLab

Research reference, 8 November 2026. Recommendations for Product Owner review,
not automatic backlog additions, stack changes, release approval or task scope.

## Article reviewed

Shrey Vijayvargiya, How to Build SAAS Application, 4 December 2025:
https://shreyvijayvargiya26.medium.com/how-to-build-saas-application-c47420119a54

The article covers choosing a problem, validating demand, a small MVP, familiar
tools, billing, early distribution, feedback and launch assets. Its most useful
principle for this project is a short build/use/learn loop. Its suggested tools
and compressed launch timetable are opinions, not acceptance evidence.

## Product and customer

Our approved launch promise is the Garmin/COROS athlete journey in
MVP_RELEASE_CRITERIA.md. The first customer hypothesis is an endurance athlete
who already records training but struggles to turn trustworthy data into a clear
daily decision. This is a hypothesis to validate, not demonstrated market demand.

Observe a complete recent journey: how an athlete checks readiness, chooses a
session, notices a bad import, corrects it and evaluates the result afterward.
Ask about actual behavior and the last specific problem, rather than whether
they like an idea or an AI-generated concept.

Evidence strength differs: an AI assessment is brainstorming; a signup shows
interest; completing onboarding shows activation; returning voluntarily shows
repeat value; paying and continuing shows stronger commercial evidence.
Do not call any one of these product-market fit by itself.

Recruit a small consenting pilot intentionally and learn from direct support.
Paul Graham's primary essay describes hands-on early user recruitment:
https://paulgraham.com/ds.html
Do not turn that advice into permission for unsolicited messages or invitations.

## MVP and release

For this existing app, simplify and stabilize the working journey before adding
more screens or changing frameworks. The smallest useful product still needs
correct access boundaries, recoverable data flows and honest numerical output.
Reduce feature breadth to move faster; do not lower integrity standards.

Our release evidence remains: verified initial/repeated Garmin and COROS sync,
accurate provenance and channels, useful non-blocking guidance, understandable
failure recovery, sound paid access, and tested export/deletion behavior.
A passing build and attractive dashboard do not establish these outcomes.
Existing engineering gates and staging requirements remain authoritative.

## Architecture and platform choice

Keep responsibilities explicit:
- Identity/ownership determines whose data can be read or changed.
- Ingestion preserves originals, normalizes channels and records provenance.
- Deterministic science computes metrics with controlled model assumptions.
- Coaching explains those results without inventing measurements.
- Presentation reports saved truth, uncertainty and available recovery actions.
- Billing grants access from verified server-side commercial state.
- Operations supplies retries, observability, support and recovery.

The present implementation remains React/Vite/Base44. No automatic Next.js
rewrite, extra authentication provider or replacement database follows from a
generic technology list. Preserve existing pure science and service contracts.

Vercel can host a frontend while Base44 still owns backend responsibilities.
An independent launch additionally needs identity, policy enforcement, data/file
storage, durable background jobs, secrets, OAuth lifecycle, billing, exports,
deletion, migration and recovery. Evaluate that future milestone separately.

The article's free-hosting suggestion needs qualification: Vercel currently
restricts Hobby to personal non-commercial use. Confirm an appropriate plan
and operational limits before a commercial launch:
https://vercel.com/docs/plans/hobby

## Subscription integrity

One endpoint can handle multiple event types; endpoint count is not reliability.
Stripe documents duplicate delivery and non-guaranteed ordering. Build around
signature verification, durable idempotency, mode isolation and authoritative
current state, using supported atomic primitives rather than invented database
guarantees. Test failed payments, renewal, cancellation, delayed events, replay
and concurrent redemption as already planned.

https://docs.stripe.com/webhooks
https://docs.stripe.com/billing/subscriptions/webhooks

The checkout success page is a UI result, not entitlement authority. A successful
charge is not proof that cancellation, access revocation and support work.

## Athlete experience and trustworthy claims

Every important state answers: what happened, which data/version was used,
what is uncertain, what changed in storage, and what the athlete can do next.
Pending work is not failed work; unknown data is not measured zero.
A successful mutation and a successful subsequent refresh are separate outcomes.

Deterministic means reproducible given defined inputs/assumptions; it does not
make a model an infallible measurement of physiology or injury risk.
Average-derived TRIMP, stream-derived zones and modeled readiness must retain
their different provenance. Do not market all metrics as measured.

Use real product demonstrations only with appropriate consent/redaction or
clearly labelled synthetic data. Do not claim verified provider reliability,
privacy guarantees or clinical outcomes before evidence supports them.

## Feedback and measurement

Proposed measures for Product Owner consideration:
- Activation: successful connection and first useful dashboard, not registration.
- Reliability: sync outcomes, duplicates, retries and freshness by provider.
- Repeat value: athletes returning for a training decision and useful feedback.
- Commercial value: paid activation, renewal, cancellation reason and support load.
- Efficiency: processing/model/storage/support cost per active and paid athlete.

Define denominators and time windows before reporting rates. Compare cohorts
rather than mixing new users with established ones. Establish baselines before
setting numeric targets. No fabricated conversion/revenue forecasts.

Avoid raw HR, GPS routes, private conversation content, OAuth credentials or
sensitive screenshots in product analytics/session replay. Any new analytics
tool requires a deliberate privacy/security decision; it is not a default install.
Collect feedback voluntarily; distinguish usability criticism from feature demand.

## Delivery organization

Use one lead, task-scoped specialists and separate QA. The two-hour schedule
creates bounded work opportunities, not a requirement for code churn.
Measure accepted behavior improvements, defect escape and blocker age.
Source-based research must receive explicit Product Owner approval before it
enters implementation scope.

The immediate priority remains staging acceptance and the approved usability
fixes. This guide does not unlock the broader security/billing/ingestion pipeline.
Future scope decisions should explain the athlete need, evidence, dependency,
acceptance test and cost of delaying foundational work.
