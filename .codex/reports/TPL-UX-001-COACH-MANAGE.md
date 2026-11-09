# TPL-UX-001-COACH-MANAGE: visible individual coach-guidance management

9 November 2026. Parent 3cefeb24633c4b5a2b36bea1a2bf03afd15e6044.
Existing PR #9 branch, inheriting the review function/entity from existing #7.
Newer owner priority: make conversation-derived coach holds manageable and show
actual app development. Garmin retention remains next after this requested UI item.

## Behavior

The existing review component could only acknowledge every displayed source at
once and hid the operation behind a generic review label. This implementation
adds an explicit Manage guidance control, dated source checkboxes, select/deselect
all shown, and Clear selected guidance with a count. Nothing clears without a
selection and a confirmed successful save. Keep guidance closes without writing.
Failed saves preserve the selected notice and show an honest retry state. A new
or edited source cannot be cleared using an old source's selection. Existing
account/athlete isolation and revision/fingerprint/ownership checks remain.

Clearing acknowledges selected automatic conversation notices, not a confirmed
human-coach restriction, a medical clearance or a prescription change. Conversation
history remains saved. Remaining unselected or newly added guidance still appears.
Native controls use large touch labels/buttons, semantic grouping, readable dates
and restored focus after save. Shared query invalidation refreshes other consumers.

Changed source: CoachSignalNotice.jsx, useCoachInjurySignal.js and its component
regressions. Existing backend protocol already supports selected source keys;
no new endpoint, schema, role grant or production record mutation was introduced.
Actual source/CSS before/after captures are under docs/evidence/coach-guidance.
All data in these images is synthetic; they are not generated product mockups.

## Executed validation

- 21 targeted component/backend review cases passed, including individual selection,
  cross-consumer refresh, stale-source selection, keep without write, changed
  athlete, failed save and success:false.
- Full suite: 281 passed, five existing expected ingestion-defect failures,
  44 files. Those five known failures are unrelated to this UI change.
- Typecheck, lint, build and backend validation pass (49 graphs, 28 resources).
  Existing catalog RLS, bundle-size and npm configuration warnings remain.
- Actual local dashboard in Chromium: select by keyboard, submit by keyboard,
  acknowledge only that fingerprint, preserve the unselected source, reload,
  clear the remainder, restore focus and keep the 25-minute workout visible.
  No page exceptions or page overflow at 820px/390px. HTTP backend is a synthetic
  stateful fixture with external requests blocked, not real hosted persistence.
- Diff/private-value review and whitespace checks pass. No Odysseus file or gitlink,
  dependency, billing, runtime backend, app configuration or workflow was changed.

## Concrete hosted blocker and release batch

Fresh read-only Base44 metadata confirms reviewCoachSignal is absent and
CoachSignalReview's schema is absent in BOTH existing staging and production.
Their target identities were verified without exposing private IDs or credentials.
This explains why merely pushing a frontend branch cannot enable the feature live.
The reviewed entity/function and frontend must reach staging together; use the
existing backend from #7 rather than a duplicate or client-only hidden notice.
Do not bypass ownership checks or use direct client entity writes as a workaround.

Staging isolation/hosted acceptance and required review remain incomplete. No
preview/staging/production deployment happened. Production data/plans are unchanged.
Separate live-release approval is still required after gates pass. The read-only
metadata check does not certify global credential/data isolation or remote RLS.

Git default/Basic authentication had failed earlier. The existing secure credential
works using a Bearer header supplied through the subprocess environment, with no
secret in command arguments, stored config or output. Record exact push/CI results
separately; do not transfer prior green checks to this source revision.

## Next

After this bounded visible UI change, implement TPL-INT-006-GAR-002, the Garmin
retention repair, on the existing branch. Publish the coach review batch only
through verified-isolation staging acceptance and appropriate independent review.
The approved automation alternative and gated Option B assessment remain separate
platform work; neither authorizes a migration, a second schedule or production.
