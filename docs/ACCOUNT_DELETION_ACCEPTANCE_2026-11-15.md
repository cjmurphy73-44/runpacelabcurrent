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

## 2026-11-15 follow-up: prevent premature profile deletion
- CI at previous exact head `5438849db302eb0f751ff724d01577c1ba0af0c2`: GitHub Actions run `43657485336` completed successfully (typecheck, tests, frontend build and source-map check).
- Newly confirmed retry-safety issue: deleting `AthleteProfile` before athlete-ID-dependent cleanup can destroy the owner linkage needed for a retry if a later step fails. `finalizeAccountDeletion` now runs all non-profile steps first; any failure retains profiles and the User account. Only after these steps succeed are profiles and User removed. Added offline regression tests covering premature profile deletion, success ordering and profile-delete failure.
- **Residual retry risk:** If profile deletion succeeds and the final User deletion subsequently fails, a later retry can encounter a missing linked profile. This requires a durable deletion job/manifest or recovery contract before declaring end-to-end reliability. Entity cleanup is not transactional.
- **Storage contract evidence:** Base44 platform API lists `DELETE /api/apps/{app_id}/assets/{asset_id}` specifically for the app **media library**. This is not evidence of an API to delete athlete-uploaded private workout files referenced by `WorkoutAsset.file_url` / `WorkoutSession.raw_file_url`. No guessed storage deletion operation has been introduced.
- **Staging inspection:** Read-only app metadata was requested using `GET /api/apps/{app_id}`, but its returned object was truncated. Do not infer separate DB/auth/secrets/function routing from this response or the distinct app IDs.
- Current head CI status must be checked independently; none of these edits constitutes live deletion, staging RLS or storage purge proof.

## 2026-11-15: proposed durable recovery journal (draft only)
- Previous exact head `d44d93713302e5f09545ce2e0e52209af7c2915d`: GitHub Actions run `43657768435` completed successfully (typecheck, tests, frontend build, source-map check).
- New `AccountDeletionRecovery` schema restricts all operations to admin role; deletion function uses service role. Its `user_id` and verified `athlete_ids` are persisted before destructive cleanup and a matching `prepared` record is reused for retry after profiles disappear.
- New offline tests cover prepared-journal retry without profiles, foreign or corrupted entries, multiple ambiguous records, persistence response validation and foreign ownership rejection.
- **Platform acceptance required:** prove new entity is deployable; service-role create/filter/delete persist atomically enough for recovery; verify pagination and concurrent requests, particularly two simultaneous requests creating two journals. No unique constraint or locking is established. No deletion against real users.
- **Crash/retention risk remains:** after User deletion succeeds but recovery-record deletion fails, the user cannot authenticate to retry. An operator reconciliation mechanism, audit access, retention window and eventual purge are required. File purging remains absent. This draft PR must not merge until these are addressed.
- **Scan evidence:** read-only Base44 scan status for production app `6a504ebe6a5a6d1be058226c` is `out_of_date`; scan response was truncated, so detailed finding counts and file paths were not reliably enumerated. Staging app `6aefe9d09e2788fc8591c758` reports scan status `none`. Neither is a clean or fresh scan.
- The app-media-library delete endpoint does not establish safe deletion of private uploaded workout files. No guesswork or live storage operation performed.

## 2026-11-15: post-create journal consistency guard
- Exact-head prior CI `7279f9f7af74957cdcb18f114d03e7165f2307c1`, run `43658040487`, reported successful test, typecheck, production build and source-map verification steps.
- New `verifyDeletionRecoveryScope` performs a second scoped service-role read after journal create/reuse and before any entity deletion. It rejects missing records, multiple journal rows, replaced IDs, changed athlete IDs, changed state and wrong user owner.
- Offline tests cover one valid journal, two concurrent journal rows, changed/missing row, and foreign user rejection.
- **Explicit limitation:** the read-after-write check is not a transaction, atomic unique index or distributed lock. A second request may race after verification. Require vendor-supported atomic unique `user_id` semantics or locking/queueing before production merge.
- **Operator reconciliation and retention:** any orphan journal after User deletion must be handled by an authenticated admin-only procedure which checks whether the user still exists, verifies no active account or athlete records remain, reconciles private files, records auditable resolution and deletes the journal only after proof. Never auto-delete orphan journals on elapsed time alone. No such workflow has been implemented or run.
- **Private uploads:** Base44's discovered asset-delete API deletes media-library assets only. The private uploaded FIT/TCX/CSV byte-purge contract remains unverified. Do not treat deleting `WorkoutAsset` records as file purging.
- **Security:** last read-only main-app scan status was `out_of_date` and response truncated; staging `none`. Detailed findings cannot be marked resolved on this evidence.
