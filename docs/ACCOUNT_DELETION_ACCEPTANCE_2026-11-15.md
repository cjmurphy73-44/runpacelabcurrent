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
