# TrainPaceLab MVP release criteria

Product Owner direction incorporated 2026-11-08. This document defines launch
outcomes; the seven engineering gates still determine execution order.

## Launch promise

Garmin and COROS athletes can connect their device, trust training/recovery data
that is actually available, and get useful guidance for their next training
decision. Advanced breadth is not a launch substitute for a dependable journey.

## Required end-to-end outcomes

| Journey | Required evidence before launch |
| --- | --- |
| First useful dashboard | A new athlete signs up, creates a profile, connects either supported provider and understands the imported result/next action without team instructions. Record completion time and friction; missing provider data has an honest actionable state. |
| Repeated sync | Both Garmin and COROS pass authorized real-account initial/historical/repeated sync, refresh, disconnect/reconnect, retry, timezone/day-boundary and duplicate checks. No silent failures or duplicate workouts in the tested scenarios. |
| Data fidelity | Raw files/high-resolution streams are attempted first when supported. Preserve available channels/precision. Compare fixtures and authorized provider records end to end; missing/restricted data is explicitly labelled. |
| Understandable metrics | Source, freshness, input completeness and model meaning are visible. Stream-derived zones/Edwards load require verified per-second HR. Lap information is separate and labelled; it does not impersonate a per-second stream. |
| Useful coaching loop | Readiness/training context leads to one recommendation, workout feedback and a justified adjustment. Missing recovery limits confidence. Coach failure/pending telemetry never blocks core journeys. |
| Payment and access | Sandbox lifecycle checks cover paid access, cancellation, renewal, failure and replay; server state is authoritative. Any live purchase pilot needs explicit authorization. Clear limits, receipts and management/support paths. |
| Account control | Users can correct basic data, export and delete through tested flows. Retention and provider restrictions are explained accurately; do not claim legal compliance from unit tests. |

## Complete data and analysis acceptance

For both COROS and Garmin, follow an authorized activity end to end: original
file/native streams where supported, complete retained channels and timing,
correct athlete ownership, deterministic processing and understandable dashboard
output. Compare sample/time coverage and channel precision at every transition.
Do not call an OAuth connection or summary response a full-data pass. A provider
restriction is an explicit limitation, not permission to fabricate missing data.

Use Gate 3 TPL-DATA-001 through TPL-DATA-005 and Gate 4 for the evidence and
scientific parity requirements. Long recordings must not silently lose streams
because of a one-hour/sample cap. Both real provider journeys remain launch
requirements after synthetic/fixture validation; user data handling and external
sync activation require the approved private test arrangement.

## Brand and asset acceptance

TrainPaceLab has a consistent, legible logo/wordmark, working favicon/app assets,
and readable light/dark/iPad layouts. Every included image has a purpose, suitable
quality and lawful provenance, and passes responsive/performance/accessibility
checks. Create or optimize useful assets; omit weak or misleading imagery. Product
screenshots and illustrative charts never pretend to be actual athlete evidence.
Use TPL-BRAND-001 through TPL-BRAND-004 for the bounded work and review decisions.

## Scientific and product interpretation

Average-based Banister TRIMP can remain valid for a summary-only session with
provenance. Zone-derived contribution is excluded/zero when no verified stream
exists; that does not mean the session had zero physiological stress. Distinguish
EWMA CTL/ATL/TSB from the two-compartment impulse-response model. The coach's
verified-history inputs must be explicit, not silently substituted for the
general session-load model. AI does not invent physiological measurements.

Exact fallback notice when appropriate:
"AI Insights running on verified stream history (Summary-only sessions excluded)."

No verified history should produce a transparent insufficient-data state, not
a fabricated recommendation or misleading claim that history was used.

## Evidence environments

- CI/unit fixtures establish deterministic behavior, not real provider health.
- Isolated staging uses synthetic profiles and sandbox credentials. It is the
  default environment for all implementation/integration tests.
- Real Garmin/COROS health remains a separate launch-blocking check. Plan an
  explicitly authorized pilot using dedicated consenting test athletes/accounts
  and a suitable private environment. Do not put real health data into synthetic
  staging, public fixtures, screenshots or CI logs, or connect the owner's real
  wearable simply because a sync function exists.
- Record tested provider/device/API scope, dates, expected/actual results and
  limitations privately where needed. Never claim universal coverage.
- Both provider journeys must be demonstrated, not inferred from shared code.

## Instrumented beta

Use a small, explicitly invited Garmin/COROS cohort after foundational gates and
launch-critical acceptance pass. The Product Owner approves invitations, data
handling and any real payments. Capture:

- Signup-to-device connection completion and first-sync success.
- Time to first useful dashboard and repeat sync success.
- Duplicate rate, retry/reconnect outcomes and support requests.
- Weekly use and whether guidance affects an athlete's decisions.
- Trial-to-paid conversion, cancellation reasons and willingness to recommend.

Define event names, denominators, periods and privacy controls before relying on
rates. Obtain a baseline before inventing targets. Review the largest failure
and friction sources, fix them, then repeat. Do not collect raw health/GPS data
in product-analytics events. The Product Owner sets launch targets from evidence.

## Deferred from the first MVP

New wearable providers, broad coach/team tooling, advanced model-comparison UI,
large analytics expansions and a Base44 replacement are deferred unless a
specific validated launch need changes priority. Retain useful existing code
without expanding or advertising unverified capabilities. Brand is TrainPaceLab;
stress-response curve imagery is illustrative, not fabricated athlete evidence.

## Launch decision

All required journeys have evidence, critical security/billing/deletion gaps are
resolved, Garmin and COROS real-account checks pass, and the core coaching loop
earns repeat use in the beta. Missing provider data can be a supported state;
unknown provider reliability is a blocker. The Product Owner authorizes release.
