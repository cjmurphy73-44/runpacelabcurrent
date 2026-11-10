# Fluid status and coach-restriction journey

Product Owner requested a systemic usability improvement, 8 November 2026.
Status: reproducible discovery and acceptance design complete; app implementation
NOT started. Pipeline PRs 1/2 remain unmerged; their gate is unchanged.
No real athlete data or account changes were used.

## Reproduction evidence

Source inspected: PR #5 tree e29b86501897ada9baae0097bb3f7e5f431de379.
Executed the existing computeInjurySignal with synthetic messages and a fixed
clock of 2026-11-08T12:00:00Z. This is actual function execution, not live UI proof.

| Synthetic input | Actual result | Problem |
| --- | --- | --- |
| I am not injured and feel well. | hold | Negation interpreted as a restriction. |
| New coach clearance after earlier no-running message | hold | No explicit clearance/resolution model. |
| Athlete asks Should I see a physio? | hold, labelled coach-directed | Speaker and intent are not distinguished. |
| Matching messages November 7 and November 3 | banner cites November 3, latestMatchingDate November 7 | Evidence ordering and triggering reason disagree. |
| Matching message dated December 1 | hold on November 8 | Future timestamp is accepted. |
| No running until reviewed, dated October 23 | none on November 8 | Age alone removes restriction; no review occurred. |

These are software behavior findings, not a judgment about anyone's ability to
resume sport or a medical clearance.

## Cross-component communication findings

- src/lib/coachInjurySignal.js: substring keyword matching derives none/caution/
  hold, no structured start/review/resolution history, and evidence order can
  select an older message for the banner. Role is displayed but not authorized.
- src/hooks/useCoachInjurySignal.js: separate consumers fetch independently;
  no conversation/restriction invalidation or refetch action; errors become
  none, losing the distinction between no restriction and unavailable status.
- src/components/dashboard/TodaySessionCard.jsx: claims an automatic recovery
  swap, but this branch changes the rendered card rather than the stored session.
- src/components/dashboard/TrainingCalendar.jsx: warns of replacement while
  retaining the run's original duration/zone and workout export action.
- src/pages/TrainingPlan.jsx and src/hooks/useCoachingInsights.js: separate
  consumers can disagree about current status and freshness.

## Product-wide status contract

Every async/exception state communicates: what happened, source/time, affected
capability, whether work was saved, one primary recovery action, and outcome.
Represent loading, pending, ready, partial, error and unavailable explicitly.
Never translate a failed lookup into an authoritative no-restriction state.
Core workout access, logging, ingestion and analytics remain available.
Use this contract incrementally for restrictions, sync, imports and plan actions;
this is not permission for a broad rewrite or extra feature work before Gate 0.

## Proposed first implementation slice after gate completion

1. A single authoritative athlete-scoped restriction record, with source,
   authorized actor, affected sport, reason, start/review timestamps, status,
   version and resolution history. Exact schema/API needs security review.
2. Distinguish an inferred conversation suggestion from a confirmed restriction.
   Keyword matches can invite review; they cannot claim a coach issued an order.
   States: suggested, active, review_due, resolved. Retrieval freshness/error is
   separate, not a restriction state or proof of clearance.
3. Primary card action: Review running restriction. Show current reason, source,
   dates, affected behavior and available actions. No raw paragraph dump.
4. Allow an authorized owner to resolve an athlete-managed/inferred restriction;
   coach-managed restrictions use the authorized coach review flow. Do not
   interpret a button or AI message as medical clearance. Explicit transitions,
   permission checks and audit history must be server-authorized.
5. On review date, request review; do not silently clear. Resolved source evidence
   cannot reactivate the same restriction. A distinct new report requires a new
   reviewed event. Reject invalid/future timestamps as activation evidence.
6. Shared query/state plus invalidation updates dashboard, calendar, plan and AI
   context after save, refocus and relevant new events. Clear stale athlete state
   on account/profile change; reject stale concurrent writes explicitly.
7. Keep restriction resolution separate from plan mutation. If only advice is
   displayed say Suggested alternative; show the stored session honestly.
   Any actual plan replacement/restoration is a separate explicit saved action
   with confirmation of what changed. Export and calendar reflect stored truth.
8. Missing streams use the approved limited-data AI notice and verified-history
   behavior. They do not create an injury restriction or block core functions.

## Acceptance / future regression cases

- All six executed cases above have explicit expected behavior, not keyword
  exceptions for one account. Negative/question text alone creates no active hold.
- Authorized resolution survives refresh and old message retrieval.
- Confirmed coach-managed restrictions cannot be cleared through client spoofing.
- New/reopened restrictions retain distinct evidence and review history.
- Review due is not automatic clearance; unsupported dates cannot activate a hold.
- Failed read/save gives an honest retry state and preserves existing known
  status, affected drafts and plan data; it never falsely reports save success.
- Successful resolution invalidates all consumer views without a page reload.
- Stale/concurrent update yields conflict recovery rather than overwriting a newer
  state. Account switch never displays another athlete's cached restriction.
- Non-running sessions remain accessible; workout logging, ingest, analytics and
  source-file access do not depend on coach generation succeeding.
- No UI says a workout was changed unless the saved plan actually changed;
  calendar, session detail and export agree after an authorized plan action.
- Staging end-to-end tests cover synthetic athlete, assigned coach and nonowner.
  UI checks cover keyboard/focus, narrow mobile view, loading, failed save,
  retry and accessible status announcements. No real athlete account bypass.

Implementation evidence required: approved API/schema review, exact commit/CI,
synthetic staging recording/screenshots, and cross-view state assertions.
This document is scoped design/reproduction evidence, not a deployed fix.
