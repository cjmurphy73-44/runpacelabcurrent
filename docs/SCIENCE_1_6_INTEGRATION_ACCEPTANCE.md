# Science 1.6 integration acceptance

## Dependency reconciliation

- PR #142 (daily-load evidence) is the base.
- PR #145 (rest review) adds coverage UI and the original unsafe confirmation endpoint.
- PR #146 replaces that write endpoint with a read-only, fail-closed preview.
- This integration branch includes all three and adds a non-mutating verified CTL/ATL preview and a hard stop for legacy CTL/ATL persistence.
- Merge order must not expose #145 without #146. Prefer one reviewed integration merge after staging acceptance.

## Actual staging inspection

Connected apps are separate: production `6a504ebe6a5a6d1be058226c`, staging `6aefe9d09e2788fc8591c758`. A restorable staging checkpoint was created **before** source changes: `6af81a577aa70e7c89d6bb34`.

The staging DailyMetrics source schema was updated with `confirmed_rest`, `confirmed_rest_source`, and `confirmed_rest_at`. Shared read-only science helpers, reviewRestDays endpoint, and RestHistoryReview component source were copied into staging. **Base44 refused to apply the function bundle**, including errors in pre-existing unrelated functions (`acceptInvite` Python syntax, unsupported `@base44/cloud` imports in calculateTrainingLoad and calculateBanisterModel, and unresolved `@base44/runtime` in calculateVDOT). Source commits are **not proof that functions are deployed**. The Physiology page was not altered in staging, so the new review component is not yet wired into its running UI. Do not claim staging E2E passed.

## Scientific safety

- Unknown days are not rest.
- TRIMP and TSS cannot be combined as the same unit.
- UTC date boundaries are not athlete-local dates. No workout date normalization has been validated.
- `recomputeCTLATLTSB` now explicitly refuses all persistent recalculation while full-history completeness, timezone, and concurrency cannot be established. This is a temporary functional limitation, not a completed production science pipeline.
- `previewVerifiedLoadHistory` provides a pure, deterministic 42/7 EWMA demonstration for explicitly verified fixture histories only. It does not update DailyMetrics, athlete profiles, dashboard or plans.
- Offset-based pagination cannot guarantee an atomic snapshot while device imports run.
- The existing legacy history recalculation had potentially truncated reads and default-zero filling, so do not re-enable without stronger guarantees.

## Remaining acceptance work

1. Repair the unrelated staging Base44 function bundling errors on a separate, reviewable branch or approved isolated staging change, without modifying production.
2. Confirm whether Base44 supports stable cursor pagination or a server-side transactional storage primitive. Implement safe backend snapshot/locking before writes.
3. Normalize workout dates using athlete-configured IANA timezone, retaining original event timestamp and source timezone, with DST regression tests.
4. Verify the full recording-to-DailyMetrics-to-Physiology dashboard path using **staging test athlete data**, including partial syncs, unknown days, rest conflicts, mixed units, duplicate sessions and pagination boundaries.
5. Reconcile the existing staging Physiology UI (which has more complete onboarding/empty states than GitHub main) instead of overwriting it with the older simplified page.
6. Verify the Base44 bundle is actually applied, and test authorization/RLS before any merge or production deployment.

## Evidence level

GitHub CI validates static code, unit tests and frontend build. No live Base44 end-to-end test is claimed; no production deployment or mutation was performed.
