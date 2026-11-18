# COMMERCIAL-LAUNCH-002: Evidence-gated Australian beta launch brief

**Status:** Draft for internal review, 2026-11-19. **Release:** HOLD. **Scope:** commercial positioning, offer validation, onboarding/support and measurement, not payment activation. **Ownership:** complements PR #258 assumption-only unit economics, PR #260 privacy-safe funnel analytics, and #253/#254 pricing-claim safeguards; does not modify those workstreams.

## Positioning and buyer hypotheses

TrainPaceLab: **Understand your training. Own your progress.** A neutral endurance-training intelligence product that separates measured workout evidence from estimates, explains training context, and supports a coach-aware plan. These are *proposed* positioning claims, not proof of market demand or a promise of injury prevention.

| Hypothesis (unvalidated) | User problem to interview for | Product proof required before marketing |
|---|---|---|
| Self-coached runner with a COROS watch | Activity is recorded, but deciding what to do next is unclear | Original FIT provenance, understandable Home/Last Workout, credible no-data states |
| Multisport Garmin user | Training history is fragmented across sports | Authorized Garmin connectivity, complete import and consistent sport-specific analysis |
| Endurance coach managing a small roster | Hard to distinguish recent load from athlete-reported recovery | Permission-safe roster, assignment visibility and explicit coach-hold precedence |

**Do not advertise Garmin or COROS as fully operational until real-account connection, sync, disconnect and recovery acceptance is recorded.** Do not claim athlete outcomes, accuracy percentages, injury-risk reduction or coaching superiority without independent evidence.

## Packaging hypotheses (not approved prices)

1. **Core:** workout history, clear data provenance, essential training context. Determine actual entitlement boundaries from server-authoritative code before describing a free tier.
2. **Pro:** more analysis and planning only when the live entitlement implementation and pricing page agree. Previously discussed A$9/month is a **historical proposal**, not an approved current checkout price.
3. **Coach:** roster and coach-safe training workflows only after two-account authorization and coach-hold tests pass. No “coming soon” commitment with a launch date.

**Pricing gate:** compare current app copy, Stripe product/price IDs (read-only authorized evidence only), entitlement checks and refund/terms copy. If any mismatch or evidence is inaccessible, pricing stays unpublished and checkout disabled. No live charge, refund, credential change or customer-finance access in this workstream.

## 30-minute approval-gated launch review (manual, not an activated scheduler)

| Minute | Read-only check | Required evidence | Stop condition |
|---|---|---|---|
| 0–5 | Exact GitHub HEAD, branch protection, relevant PR ownership, CI and Vercel status | Links, SHAs and check conclusions | Unknown head, failing required checks |
| 5–10 | Published-source mapping and isolation | Base44 checkpoint + source SHA + timestamp + asset identity | No authoritative source or isolated execution |
| 10–15 | Product trust: Garmin/COROS provenance, zone purity, 60-record history limitations | Synthetic fixtures plus separate authorized provider acceptance | Summary-only analytics represented as measured |
| 15–20 | Privacy, coaching and account deletion | Two-account RLS negative tests and coach-hold evidence | Cross-athlete read/write possible or unverified |
| 20–25 | Checkout and support readiness | Server-only entitlement, webhook idempotency, no live checkout; accessible support recovery | Checkout identity client-controlled or unresolved |
| 25–30 | Go/no-go decision | Signed reviewer, blockers, rollback owner, release candidate SHA | Any P0 red/unknown gate |

This is a **checklist**, not permission to run every 30 minutes, deploy, or test on production records.

## Ethical acquisition experiment (draft only)

**Landing message:** “See what your training data can actually support.” Explain measured versus estimated metrics beside a sample *synthetic* workout, then offer a clearly labelled invitation to request beta access. Do not use scarcity timers, fake testimonials, unverified rankings, invented conversion rates or implicit medical assurances.

**Research plan:** interview a small, opt-in set of athletes and coaches only after separate approval for contact. Ask for the last confusing training decision, device used, evidence needed to trust a recommendation, and willingness to pay *without quoting a live price*. Capture consent and anonymize notes. No outreach is authorized by this document.

**Editorial draft sequence:** Week 1: “What a watch summary cannot tell you”; Week 2: “Why training load and readiness are different”; Week 3: “How to spot missing recording data”; Week 4: “Coach guidance remains above an algorithmic score.” Each requires scientific review, licensed imagery, accessibility text and explicit publishing approval. Do not publish or schedule.

## Measurement contract and financial honesty

No traction, revenue, CAC, LTV, conversion rate, churn or runway is known from this document. Use **UNKNOWN**, never zero, for unavailable observations. Forecasts must label every input as assumption, sourced benchmark or measured internal value; never mix these into one reported metric.

Proposed opt-in, privacy-preserving event funnel: landing view → beta interest submitted → verified signup → first authorized workout ingested → first meaningful analysis viewed → plan used → paid entitlement confirmed. Count only deduplicated events; report denominator and observation window; suppress tiny cohorts and identifiers. Do not infer purchase from a checkout click. PR #260 owns implementation of funnel-claim suppression.

**Synthetic scenario only:** if 100 opted-in visits yield 10 interest submissions, the hypothetical interest rate is 10/100 = 10%. This is a mathematical example, **not** TrainPaceLab performance. Acquisition spend and revenue remain UNKNOWN. PR #258 owns detailed unit economics.

## Beta customer support readiness

Before an invite, ensure an accessible contact path, a no-data explanation, device reconnection instructions that do not request tokens, a duplicate-workout resolution path, a billing-dispute escalation route and account-deletion confirmation. Support templates must never ask for FIT files containing personal health data over public comments or unencrypted email. Route security/privacy incidents to an authorized private process; stop external invitations until severity is triaged.

## Go/no-go decision record (template)

- Review date/time and reviewer: **NOT RECORDED**
- Release candidate Git SHA / Base44 checkpoint / deployment ID: **UNKNOWN**
- Exact-head CI and isolated browser screenshots: **UNKNOWN**
- Garmin/COROS end-to-end provenance: **UNVERIFIED**
- Two-account privacy / coach safety: **UNVERIFIED**
- Checkout/entitlement lifecycle: **UNVERIFIED**
- Pricing and terms consistency: **UNVERIFIED**
- Support owner and rollback owner: **UNASSIGNED**
- **Decision: HOLD.** A green source PR does not imply deployed or verified live.

### Acceptance tests for this document

1. A reviewer can identify every P0 launch gate and its evidence owner without a production test.
2. All prices, personas, adoption and finance examples are explicitly hypotheses or synthetic.
3. No live-provider, payment, marketing publication or deployment action is authorized.
4. A release decision cannot be “GO” while any critical item is unknown.
5. Every candidate requires a reproducible Git SHA, independently executed tests and separate published-source proof.

**Next task:** obtain exact-head isolated execution evidence for Home PRs #277–#279 and reconcile them into one release candidate; do not create another overlapping Home feature PR. Resolve platform source-mapping and payment/identity blockers before inviting customers.
