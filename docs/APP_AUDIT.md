# App experience audit checkpoint

8 November 2026. Local review based on existing PR #9 head
`84ddd709711244be3a174c455f810fc3cad1c8d5` plus the changes in this branch.
This file is the durable public summary. Private environment/session evidence
and detailed security reproductions remain outside Git.

## Prepared fixes

- Authenticated root entry goes directly to the app; SDK sessions survive reload.
- A visible day/night control persists its setting on this browser.
- Non-coach plans do not show Roster navigation. Existing admin access is
  preserved, but does not insert coach navigation into the athlete experience.
- Disallowed/loading coach pages do not fetch roster data before access resolves.
- Wearable selection, provider availability and successful sync are distinguished.
- User Guide data matches its renderer and unknown provider states render safely.
- Onboarding requires an explicit final confirmation before creating a profile.
- Duplicate floating feedback UI and narrow Workouts/Imports overflow are removed.

## Verification

Typecheck, lint, build and backend validation passed locally. The unit suite
passed 246 tests in 40 files. Offline backend validation covered 49 entry graphs
and 28 resources; three catalog RLS warnings remain. Platform runtime APIs are
external to that validation.

Chromium loaded all 31 registered route paths at desktop, iPad and narrow-screen
sizes (93 checks) with synthetic HTTP fixtures and external requests blocked.
Final runs showed no uncaught page exceptions or page-level horizontal overflow
in those scenarios. Role/theme checks, signed-out routing, direct roster gating,
novice onboarding, final confirmation and reload were exercised separately.
These are frontend checks, not evidence of real provider or billing operations.

The Product Owner manually confirmed that the existing staging app accepted
sign-in/onboarding and reached the dashboard. That tested the previously deployed
staging version; it does not establish deployment of this branch's new changes.

## Open findings

- Race-result onboarding remains blocked by incompatible caller/science-module
  contracts. The novice/mileage path passes. Do not replace the missing race
  calculation with a fabricated default estimate to make the flow pass.
- Authorization, URL-fetch safety, billing concurrency/mode isolation, data
  fidelity and resumable deletion require their roadmap acceptance work.
- Offline queue persistence and auxiliary Python/scientific scaffolding need
  repair before being represented as production capabilities.
- Supported-file promises differ across uploaders and need real file fixtures.
- Provider OAuth, AI generation, billing, deletion, cross-athlete permissions and
  populated longitudinal dashboards have not received remote acceptance here.

A green fixture test is not a completed MVP gate. Review and staging acceptance
must track the exact source being released, with private identifiers omitted.
