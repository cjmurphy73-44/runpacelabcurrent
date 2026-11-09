# Coach chat load and send recovery

Owner prioritized visible implementation over further Base44 login diagnosis.
One frontend task on existing PR #9, no backend/auth/billing or deployment change.

Before: rejected list/get/create left an endless loading screen with no retry;
message input was cleared before acknowledgment and lost on failed delivery;
icon-only send had no accessible name or overlap guard.

After: explicit load failure with Retry coach conversation and Back to dashboard;
retry rechecks existing named conversations, never selects orphan/test threads.
Cancelled load results do not update an unmounted component. Failed sends retain
in-memory draft, restore focus, announce unconfirmed delivery and warn to check
conversation before retry (no exactly-once guarantee). Input clears on SDK success;
overlapping submit events are blocked. Named input/send and 44px send target.
Drafts are not newly persisted in browser storage; navigation can still discard
an unsent draft. Remote AI response timing/socket recovery is separate work.

Validation: four targeted regression cases; full suite 304 passed/four known
COROS expected failures, 46 files. Typecheck/lint/build/backend validation pass
with pre-existing chunk/schema warnings. Real Chromium local page checked at
820px and 390px with synthetic HTTP failures, retry/draft/focus/no-overflow and
zero page errors. Screenshots in docs/evidence/coach-chat.

Not live: Base44 Google callback still reportedly rejects the staging domain;
initiation checks alone do not establish sign-in success. Parked per owner.
Exact-head CI, independent review, inherited Odysseus merge preservation, hosted
acceptance, component manifests/rollback and separate production approval remain
release requirements. No production data change or deployment was performed.
