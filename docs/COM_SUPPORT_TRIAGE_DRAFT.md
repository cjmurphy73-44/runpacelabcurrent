# COM-SUPPORT-001: Beta support and incident triage (draft)

**Status:** Proposed only. No live support commitment, production monitoring integration or external publication is implied. Owner and coverage hours must be assigned before beta invitations.

## Purpose and boundaries

Keep athlete trust ahead of conversion. Treat failed sync, uncertain workout provenance, access failures, and billing disputes as support incidents, not marketing opportunities. Support intake must never require a password, OAuth token, webhook secret, payment card number, raw health record or full workout file. Use an internal random case ID and the minimum metadata necessary for diagnosis. No user-facing success claim until a support record is confirmed persisted (see draft PR #209).

## Classification and safe first response

| Class | Trigger | Immediate action | Release consequence |
|---|---|---|---|
| P0 Security/privacy | Suspected cross-athlete visibility, exposed token, unauthorized coach access | Stop further testing; restrict internal access; escalate to owner/security reviewer; preserve minimal timestamps and request IDs, not payloads | Hold beta invitations and release |
| P0 Billing | Unrecognized charge, cancellation still charging, access granted without paid proof | Do not initiate charge/refund or change entitlement from a support ticket; escalate to billing owner; use Stripe-authoritative investigation in separately approved environment | Hold billing expansion until reconciled |
| P1 Data trust | Invented zones, unverified recording shown as measured, duplicate sessions, data loss | Mark results unverified; ask for provider, local date, activity ID if safe, and a redacted screenshot; never claim sync succeeded without confirmed persistence | Hold affected feature/release |
| P1 Account access | Registration, reset or login loop | Ask only for device/browser and time; do not request password, OTP or recovery link | Block new invitations if widespread |
| P2 UX/support | Navigation, copy, layout, ordinary how-to | Record route, device width and reproducible steps; preserve original user report | Queue independently testable fix |

**Unknown outcome rule:** a timeout, missing receipt ID, provider summary without verified stream, missing webhook acknowledgement, or conflicting entitlement state is **unverified**, never success. Do not promise a refund, deletion, data recovery or subscription change before an authorized owner confirms it.

## Minimum internal case record

`case_id` (random, non-identifying); `opened_at_utc`; `category`; `severity`; `product_surface`; `environment` (preview/staging/production/unknown); `reported_symptom` (redacted); `source_commit_sha` if verified; `deployment_id` if verified; `evidence_state` (reported/reproduced/CI-verified/preview-verified/production-verified); `owner` (unassigned until named); `next_action`; `resolution_state` (open/blocked/resolved); `user_notification_state`. Store no raw access tokens, billing details, physiology values or full URLs containing query credentials.

## Customer-facing response templates (draft)

**Sync uncertain:** “We received your report, but have not verified that the activity was imported. Please do not delete your original recording. We will check the import status and let you know what we can confirm.”

**Billing dispute:** “We have received your billing concern. We have not made a charge, refund or subscription change in response to this message. A billing reviewer will investigate before confirming an outcome.”

**Possible privacy incident:** “Thank you for reporting this. We are escalating it for urgent review. Please avoid sending account credentials or additional personal health information.”

Only send a template after confirmed receipt. Do not imply a staffed response time until coverage is established.

## Synthetic acceptance matrix (must be executed before launch)

| Fixture | Expected support behaviour |
|---|---|
| Support endpoint resolves but returns `{error:'write failed'}` | No “sent” toast; retain form contents |
| Support endpoint returns `{success:true}` without persisted ID | No confirmed receipt |
| User pastes OAuth token or card number into report | Redact before storage and logs; no echo in response |
| Sync returns 3 imported, 2 failed, 1 uncertain | Never describe batch as fully successful |
| Stripe event says active but authoritative subscription snapshot is unavailable | Do not grant or promise premium access |
| Two users report cross-athlete access | Escalate P0, stop cohort expansion, preserve redacted evidence |
| Preview passes but production source SHA is unknown | Keep live verification unverified |
| User asks support agent to refund | Escalate; no money movement from support workflow |

**Acceptance:** owner signs off on category routing, retention/privacy policy, redaction, support staffing, escalation contacts, and test evidence for each fixture. This document does not assert those controls exist. Any real-world privacy incident must follow applicable legal notification requirements with professional review.

## Beta launch metrics, definitions only

Track counts of **confirmed** tickets by category and severity, first confirmed response time, unresolved age, reopened cases, and sync/billing incidents per active beta account. Exclude raw health and financial details from analytics. Denominators, baselines, staffing costs and targets are **TBD**, not invented traction. Never infer customer acquisition cost or lifetime value from support tickets.

## Dependencies

- Draft PR #209: persisted support receipt acknowledgement, pending exact-head CI.
- Draft PRs #141/#143/#144: Stripe mode, atomic reservation and authoritative lifecycle, not released.
- Beta readiness Phase 0–2: account, privacy, and billing acceptance remain unverified.
- COM-001 issue #62: commercial launch remains gated on trust and payments.

**Release HOLD:** No deployment, publication, production data access, billing change or customer communication authorized by this draft.
