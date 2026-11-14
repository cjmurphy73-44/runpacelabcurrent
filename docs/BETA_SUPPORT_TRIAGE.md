# TrainPaceLab beta support triage and privacy-safe incident playbook (draft)

**Status:** review-only; not a live support policy. **Owner:** pending assignment. **Scope:** beta support and operational incident intake (OPS-004 / COM-001). This document does not assert live support staffing, response-time commitments, telemetry availability, customer counts, or successful staging isolation.

## Minimum intake (consent-first)

Record only: issue category, UTC time, app route, browser/device version, reported provider (if relevant), user-observed error text after redaction, environment claimed by reporter, and an opaque internal ticket reference. Ask for permission before collecting additional diagnostics. **Never request passwords, OAuth tokens, Stripe card details, raw health exports, precise location, athlete medical data or screenshots exposing another athlete.** Do not paste private support messages or customer identifiers into GitHub issues, CI logs, AI prompts or public documentation. Keep identity-to-ticket mapping only in an approved restricted support system (not yet selected).

## Decision matrix (manual, fail-closed)

| Signal | Initial priority | Safe first action | Escalation / stop condition |
|---|---|---|---|
| Suspected cross-athlete visibility or unauthorized account access | P0 | Stop reproduction using real accounts; preserve redacted timestamp, route and environment; restrict incident discussion | Escalate immediately to security owner; block beta expansion and relevant release until ownership isolation is independently verified |
| Billing charged but entitlement missing, duplicate charge allegation or refund request | P0 | Acknowledge; request only opaque ticket reference and purchase time range through approved private channel | Escalate to authorized billing operator for read-only provider verification; **no charge, refund, entitlement override or live webhook replay** without approval |
| Fabricated zones, unverified physiological outputs presented as measured, or athlete data corruption | P0 | Mark reported output unverified; preserve provenance labels and non-sensitive reproduction steps | Escalate to science/data owner; prevent affected output from being treated as verified until deterministic regression and source recording are checked |
| Garmin/COROS import failed or partial | P1 | Capture provider, rough time range, app status and sanitized error code; prefer synthetic test fixture | Escalate if duplicate ingestion, ownership issue, repeated retry failure or missing original recording; never claim streams exist based on summary alone |
| Mobile navigation, keyboard, contrast or screen-reader failure | P1 | Record viewport/device and reproducible interaction sequence without account data | Route to accessibility owner; block affected core beta journey if no usable alternative |
| Copy, marketing, minor visual defect | P2 | Capture route and redacted description | Queue in UX backlog; do not imply paid features are active until server-verified |

Priority is a triage proposal, not a promised SLA. P0 means release-blocking review, not a claim of 24/7 staffing.

## Reproducible synthetic acceptance checks

1. **Unauthorized-access drill:** report a synthetic cross-account visibility allegation. Expected: P0, no request for athlete credentials/data, escalation and release block.
2. **Checkout-return drill:** visit a fabricated checkout-success URL without a server-verified entitlement. Expected: no claim of confirmed payment, active subscription or unlocked features; P0 billing escalation if a charge is alleged.
3. **Summary-only import drill:** supply a synthetic workout summary with no per-second recording. Expected: no verified stream zones; P1 ingestion investigation, provenance retained.
4. **Partial import drill:** simulate a failed asset download after summary creation. Expected: explicit partial/failure status, safe retry guidance and no silent success claim.
5. **Sensitive attachment drill:** a mock report includes an access token or medical screenshot. Expected: stop copying, restrict access, redact, and follow approved incident retention/deletion process; never include raw attachment in GitHub.
6. **Mobile accessibility drill:** simulate keyboard trap on a 390px viewport. Expected: P1 core-journey escalation and accessible alternative documented before beta acceptance.

These are **test specifications, not executed end-to-end evidence**. Use only local synthetic fixtures or independently isolated staging after the PR #149 identity gate is proven. Record test date, commit SHA, device/viewport, observed result and reviewer in a private acceptance record.

## Operational guardrails and handoff

- Acknowledge receipt without guaranteeing a fix time. Do not say a charge succeeded, a sync completed, or a subscription is active unless verified from an authorized source.
- For P0, pause the affected beta release path; involve a designated owner. No production data/schema changes, payment actions or external disclosure without explicit authorization.
- Before closing a ticket, document the customer-visible outcome, verified evidence, relevant PR/commit, whether merged, whether deployed, and whether verified live. These are distinct states.
- Unknowns before launch: named support/security/billing owners, approved private ticket system, retention/access policy, incident communications channel, real staffed coverage, refund authority and validated response-time targets. Leave each **TBD**, not invented.

**Related gates:** [atomic backlog](MVP_ATOMIC_BACKLOG.md), [beta readiness](../src/BETA_READINESS_ROADMAP.md), [commercial workstream #62](https://github.com/cjmurphy73-44/runpacelabcurrent/issues/62), [staging isolation PR #149](https://github.com/cjmurphy73-44/runpacelabcurrent/pull/149).
