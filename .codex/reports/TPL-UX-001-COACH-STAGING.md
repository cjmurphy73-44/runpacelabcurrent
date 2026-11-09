# Coach guidance: bounded existing-staging rollout

9 November 2026. Owner explicitly prioritized an app-visible result over another
code-only report. Frontend/source candidate: 7342d89a303faba42e9fc89b3aec0fece97b9a53,
existing PR #9. No production publish, main merge or production data write occurred.

## What is now usable in staging

Settings has a permanent Coach guidance section at the top. It renders even when
there are no workouts/notices, and offers the existing coach-conversation route.
When source notices exist, the existing management UI selects individual notes,
clears only checked fingerprints, keeps others and preserves plan/conversation.
The required CoachSignalReview entity and reviewCoachSignal backend are now
installed alongside the frontend. This is no longer just a local screenshot.

## Bounded authorization/isolation evidence

The existing staging target ID matched its private configured identity, differed
from production, and remained private. Both exact workflow records stayed inactive.
All eight external-sync guard files were present. Stage secret names were only
TPL_ENVIRONMENT and WEBHOOK_SYNC_SECRET; no values were read. The new coach function
uses neither provider/billing secrets nor provider HTTP calls. Its mutations are
owner-checked, app-scoped append-only acknowledgement hashes, not prescriptions
or conversation deletion. The new entity is owner-readable with admin/service
writes; no existing entity policy was changed. Scope was this owner-only coach
feature, not provider testing or certification of global credential/data isolation.

Staging's Git status was disconnected before source saves, preventing saved
staging code from being auto-pushed to repository main. Unknown source edits would
stop the rollout; six frontend files matched known prior Git versions and were
backed up before update. The new entity was saved in its canonical source file,
so the live model and app source agree. The function was compiled only from the
committed coach entry/helper, with the official SDK import left external.

A safety check paused after function deployment because deployment IDs changed.
Fresh comparison showed the identifiers advanced globally: ALL 47 prior function
file maps, entry paths, automations and required connector bindings were identical.
The eight guard implementations were retained. We verified source/behavior inputs
rather than incorrectly claiming the old deployment identifiers were unchanged.
The only additional function is reviewCoachSignal, with no automation attached.

The archived committed snapshot excluded the unfinished Garmin repair in the
working tree. Only coach schema/function and the known frontend delta were saved.
The staged ZIP was built with explicit staging app ID/origin and scanned to exclude
actual credential values. No other backend source or existing schema was replaced.

## Actual observed verification

- Committed-snapshot suite: 282 passed, five existing expected ingestion failures,
  44 files; typecheck, lint, build and backend validation pass. RLS/catalog,
  bundle-size and npm warnings remain. The new Settings empty-state test passes.
- Existing local Chromium evidence covers individual clear, remaining notices,
  reload, keyboard submit/focus and iPad/mobile layout; HTTP persistence is a
  synthetic fixture, not a hosted-user acceptance claim.
- Supported staging deploy-dist returned success and its app URL matched the
  configured existing staging origin. Private visibility and workflows remained.
- A real authenticated request to the published JavaScript asset returned 200;
  its SHA-256 matched the explicitly staging-bound compiled candidate exactly.
- The real SDK-shaped staging-host function route returned 400 and the expected
  'Valid action and athlete_id required' for invalid input using a supported
  app-user token. That reaches the new authenticated handler before profile/
  conversation data access or acknowledgement writes. The raw token was not
  printed, saved or embedded in command arguments. An earlier management-host
  probe without the SDK headers returned 403; the correct app-host/header route
  was used, without fabricated cookies or access-control changes.
- Read-only production deployment checkpoint remained unchanged throughout.
  No real athlete notices were cleared by the agent. Actual user-specific hosted
  clear/reload and A/B/coach access acceptance remain unverified, not inferred
  from an administrator validation probe or local mocks. Required GitHub CI/main
  reviews and full G0 remain open; no production-release claim is made.

The private origin, exact deployment/target IDs, source backups, API journals,
compiled bundle, artifact and readbacks are under cloud-setup/coach-staging outside
Git. Open the existing staging app's /settings#coach-guidance using its accepted
sign-in; no passwords or sign-in codes belong in chat.

## Preserved work and next step

The Garmin retention patch is preserved uncommitted and additionally backed up
under cloud-setup/garmin-retention-paused. Its targeted cases currently pass, but
resource-bound unit tests, full final validation, commit/review and any deployment
are unfinished. None of that backend/schema work was published by this rollout.
Resume GAR-002 after this owner-prioritized staging deliverable; do not discard,
repeat the source audit or claim the patch is already released. Odysseus was not
moved, deleted, re-linked or merged. Production safeguards remain unchanged.
