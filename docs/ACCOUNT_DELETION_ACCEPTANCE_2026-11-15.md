# Production readiness: account deletion gate (2026-11-15)

Status: **incomplete, not release-approved**.

## Confirmed from source
- `base44/functions/deleteAccount/entry.ts` previously ignored individual `deleteMany` failures and deleted the user anyway.
- This branch collects failing entity names, returns a non-success response and preserves the user identity for retry if a database cleanup step throws.
- Existing deletion still does **not** establish storage-file purging or exhaustive ownership coverage.
- Partial entity deletion may have occurred before an error; the retry path must be idempotent.

## Mandatory acceptance before merging or publishing
1. Offline regression tests: all cleanup succeeds => user deletion and success; one cleanup rejects => user deletion never called and response non-2xx; multiple failures => names reported without sensitive data; retry after partial deletion.
2. Inventory all entity ownership keys and linked data, including rows not created by the athlete and coach roster relationships.
3. Verify platform-supported private storage enumeration/deletion and implement safe cleanup of uploaded workout files; confirm URL ownership, no cross-account deletes and retry behavior.
4. Run only in an explicitly isolated staging tenant with synthetic users and files. Prove no orphaned rows/files, no access to other users' data, and account/auth removal.
5. Confirm the UI does not log out or show success for incomplete deletion, and that support escalation is actionable.
6. Reconcile published privacy and retention policies with actual deletion semantics.

Do not run deletion against production or real athlete accounts to satisfy these gates.

## 2026-11-15 checkpoint: linked athlete cleanup
- Exact-head CI on prior PR head `a1b76a9208398e6e08345e945ea09470221ac929`: GitHub Actions run `43657049651` completed successfully (type check, tests, production build, source-map check).
- Source comparison: `resetAthleteData` deletes many entities using `athlete_id`; prior `deleteAccount` deleted most rows using `created_by_id` only. That missed service-created rows without the athlete's creator stamp.
- New offline change: resolve owned profile IDs via service-role `AthleteProfile.filter({ created_by_id: user.id })`; reject inconsistent `athlete_profile_id` linkage; execute additional `athlete_id` cleanup for workouts/assets/metrics/plans/coaching/feedback/connections/labs/webhook events. Tests cover foreign profile rejection, multi-profile owners and exact athlete-scoped filters.
- This implementation **does not prove complete cleanup**. `filter` pagination/default limits, orphaned profile-less rows, foreign-created but legitimately linked profiles, coach-side profile references, file bytes, provider external data, and data held by external systems require separate authoritative review.
- If an account legitimately links to a profile not owned by `created_by_id`, deletion now fails closed and needs support reconciliation. Do not loosen this without independent ownership evidence.
- New exact-head CI for the above changes is pending; do not carry forward the earlier CI result as proof of this commit.

## Platform isolation and file storage status
- Source documentation contains contradictory staging assumptions. An older MVP roadmap declares no staging environment, while later workflow and draft PRs refer to staging isolation work. Base44 read-only app listing confirms two named app identities: TrainPaceLab-Staging (`6aefe9d09e2788fc8591c758`) and TrainPaceLab (`6a504ebe6a5a6d1be058226c`). This is **identity only**, not proof of separate authentication, database, function deployments, secrets or effective SDK routing.
- Repository search found no supported `storage.delete` implementation. A guessed SDK file-deletion API must not be deployed. Obtain vendor documentation or official support confirmation, along with deletion ownership and purge verification, before implementing file purge.
- No remote data reads, synthetic writes, storage deletes or live backend calls were performed in this checkpoint.
