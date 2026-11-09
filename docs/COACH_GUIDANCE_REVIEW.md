# Coach guidance review

The old keyword detector presented inferred conversation text as a coach-issued
running hold and claimed workouts were automatically swapped without saving a
plan change. It had no persistent resolution path.

## Behavior

- Conversation matches are non-blocking advisories, never confirmed restrictions.
- Today's Session, Calendar and Training Plan show the stored prescription and
  the same review component. Intelligence context uses the same query-backed state.
- Review guidance expands the exact source excerpts. Mark no longer relevant
  acknowledges only those displayed source fingerprints, not unseen messages.
- Acknowledgements persist server-side. New/edited content has a different hash
  and can be reviewed again. A changed conversation yields a 409/review-latest
  path rather than acknowledging sources the user has not reviewed.
- Read/save failure is visible and retryable; it never clears a plan or reports
  a successful review. No endpoint updates TrainingPlan/TrainingPlanSession.
- The read model considers the 30 most recently updated messages and a 14-day
  advisory window. It does not manage formal clinician/human coach restrictions
  or establish medical clearance. No such structured restriction existed here.
- Shared query keys include authenticated user and athlete; resolution invalidates
  all mounted consumers. Conversation subscription, window focus and 60-second
  polling refresh guidance. Polling is a fallback, not instant cross-device proof.

## Persistence and authorization

New CoachSignalReview entity stores owner/athlete, SHA-256 source fingerprint,
resolution and review timestamp, without duplicating raw conversation text.
Regular clients cannot write review records; reviewCoachSignal authenticates
and requires AthleteProfile.created_by_id to match the session user. It does not
trust the existing client-writable profile/coach links. Legacy service-created
profiles without this ownership mapping return an explicit error pending the
separate ownership repair. Admin impersonation/coach resolution is not introduced.

Selected keys must belong to the current snapshot revision. Append-only writes
make concurrent duplicate acknowledgements harmless; bounded read saturation
returns an explicit error rather than assuming history is complete.

## Required staging smoke before main/production

Deploy new entity, function and frontend together to the verified isolated stage.
Use synthetic sessions only. Verify:

1. Workout remains visible with advisory; no false recovery-day substitution.
2. Review, preserve/resolve guidance, refresh/relogin, verify saved resolution.
3. Resolve in dashboard; Calendar, Plan and Intelligence state update together.
4. Edit an older message; new source reappears. A stale review gets 409; refresh
   displays current evidence. Unselected guidance stays available.
5. Simulate failed read/save; honest retry state, no false success or plan changes.
6. Athlete/account switch has no old expanded/saved state or other-user data.
7. Anonymous 401, foreign-profile 403 and regular direct entity writes denied.
8. Verify Base44 filter $in, bulkCreate, entity policies and subscription behavior
   against deployed SDK/runtime. Local tests and schema validation are not proof.
9. Check keyboard navigation and narrow viewport wrapping with real staging UI.

No production deployment or merge is implied by this document. Main remains gated
on staging verification and the repository's independent approval requirements.

## Follow-up: session and calendar recovery

Today and Calendar now use user/athlete/date-keyed queries. A failed first load
is an unknown schedule with Retry, not a confirmed rest day. A failed refresh
retains the last loaded prescription with an explicit stale-data notice.

AI adjustment uses a bounded mutation state instead of a manually toggled busy
flag. Success requires the endpoint's success flag and adjusted list. No-op,
confirmed save, failed request and failed post-save refresh have distinct copy.
Both successful and failed requests invalidate Today/Calendar because a backend
failure could follow partial writes. Calendar UI state resets on athlete changes.

An actual-session render regression now covers the missed removed injury reference;
the reference is removed. The old Readiness normal line is also removed because
no HRV anomaly is not evidence that readiness is normal. Existing readiness maths
are otherwise unchanged. Eight additional component tests cover these journeys.
These states also require real staging UI verification before main/release.
