# Sprint 4: athlete-approved plan change acceptance

Scope: private Base44 staging and PR #308 stacked on PR #306. Production and reproductive-health data are excluded.

The core athlete review interface has already been deployed to private staging in PR #306. The follow-up uses dedicated audit fields instead of overwriting TrainingPlanSession.rationale_text.

## Required synthetic acceptance
- Owner receives an observational, non-medical proposal only when recent and prior workout windows have sufficient recorded sessions.
- Anonymous, foreign athlete, unassigned coach, invalid date, completed session and inactive plan are rejected with zero writes.
- Preview makes zero writes. Apply requires exact prior snapshot and explicit `APPLY_REVIEWED_REDUCTION` confirmation, plus paid entitlement.
- Snapshot includes session id, plan id, date, sport, duration, intensity, update timestamp and existing rationale. Modified or completed plans fail stale approval.
- Only one pending session's prescribed_duration_minutes is reduced. Original rationale_text and intensity_zone are preserved.
- New fields `approved_adjustment_snapshot`, `approved_adjustment_previous_duration_minutes`, `approved_adjustment_at` preserve approval provenance.
- A confirmed exact retry is idempotent. New approvals after an earlier one are rejected.
- Post-write readback validates audit fields. Non-atomic Base44 updates remain a documented concurrent-request risk, not an atomic transaction guarantee.

## Hosted acceptance gates before production
1. Full CI on exact integration head, schema migration added to *private staging* with all pre-existing entity properties, required fields and RLS retained.
2. Confirm current staging is private. Capture previous app checkpoint and compare schema field-for-field before additive update.
3. Use dedicated staging account A with an active paid test entitlement and owned pending session; check owner preview, approve, reload, original rationale, audit metadata and retry.
4. Use different athlete B, unassigned coach C and anonymous session: verify denied responses and no writes.
5. Attempt two concurrent approvals for the same session, verify no unintended overwrite. A shared transactional lock or durable compare-and-swap control is required for general release.
6. Verify hold-specific server enforcement. Frontend hold controls alone are not a security boundary.
7. Verify the legacy autoReplanOnDeviation endpoint has zero AI calls and zero writes. Verify requestMicroadjustment is preview-only.
8. Confirm the health journal remains disabled; neither coach evidence nor plan adjustments may query its entities.

No main merge, production deployment, real billing charge, AI spending or automatic plan writes during this sprint.
