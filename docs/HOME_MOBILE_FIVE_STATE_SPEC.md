# Home: mobile-first implementation handoff (exploratory, 2026-11-15)

## Repository audit
- `src/pages/Home.jsx` already provides sign-in, onboarding, retry-on-profile-error, empty training history, current dashboard, a Geek-mode deep dive, and many dashboard widgets.
- `TodaySessionCard.jsx` queries today's plan, respects the coach injury hold and presents workout guidance; it does not currently expose a complete error/freshness state.
- `src/science/athleteState.ts` computes deterministic session/load summaries. Its `adaptation` information is **not** a time-stamped, model-versioned Home chart series. Never render an invented sigmoid as athlete data.
- The Home page currently fetches athlete, workouts, coach messages and plan sessions in one `Promise.all`; a failed auxiliary query can fail the whole dashboard. Split critical/optional loading only after validating ownership, error and retry contracts.
- The existing Home page has no single authoritative completeness or freshness contract. A count of workouts is insufficient evidence for a valid current readiness or training-response state.

## Proposed first viewport (390px)
1. Small header and connection-status summary, accessible navigation.
2. Current-state card with plain-language summary **only if supported by explicit verified data quality**. Otherwise show the specific empty/partial/stale/error notice.
3. Training-response curve, visually prominent but bounded in height. Render only from a verified time-series with source, method and timestamp; otherwise show a no-chart explanation.
4. One primary next action: view today's prescribed session, connect a provider, add a missing recording, refresh, or retry, depending on verified state. A coach injury hold overrides a running-session start action.
5. Expandable provenance row: source, calculation method/version, last successful update, quality and limitations. Advanced CTL/ATL/TSB, recovery and coaching widgets remain accessible below in collapsible sections / Analysis.

## Explicit five-state presentation contract
The pure selector `src/lib/homePresentationState.js` provides `current`, `empty`, `partial`, `stale`, `error` and a strict series render gate. It does **not** assert that the backend currently supplies sufficient quality/freshness data. Load failure has precedence. Stale requires a caller-supplied policy and valid timestamp. Unknown quality becomes partial rather than fabricated current.

These states describe the *primary presentation*; store additional flags independently (e.g. stale + failed sync). Do not discard last known valid data or show it as live.

## Safe implementation sequence
1. Land and run pure state/series tests; reconcile any concurrent Home work before touching JSX.
2. Define trusted per-block quality and freshness sources. Record last successful provider sync separately from calculation timestamps; avoid assuming a single timestamp means everything is current.
3. Add `HomeStateSummary`, `TrainingResponsePanel` and `HomeProvenanceDetails` as small presentational components. Gate every number, status and graph against explicit evidence.
4. Integrate components in Home incrementally, preserving sign-in, onboarding, profile-link ownership, coach hold, manual upload, planned-session and Geek mode.
5. Test empty/partial/stale/error/current with synthetic fixtures; error/retry and multi-sport cases; 320/390/768px widths, keyboard, screen reader and contrast. Verify no horizontal scroll, 44px touch targets, textual chart alternative and one primary CTA.
6. Preview with an isolated synthetic test athlete only after staging isolation and release identity are verified. No production data mutation or deployment.

## Brand separation
Keep the existing product styling in this implementation. The teal/cream/coral identity and single-colour wordmark are **exploratory**; PR #135 remains separate, draft and unmerged. Do not merge, deploy, modify Base44, or change Vercel settings as part of this handoff.

## Verification status
Pure unit tests are authored, not yet run in the connected repository. No browser/mobile or integration checks have been executed. The existing server does not yet expose a fully verified Home training-response series.
