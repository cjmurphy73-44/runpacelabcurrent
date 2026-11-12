# Mobile dashboard remediation — 12 November 2026

Evidence: seven authenticated iPhone screenshots supplied by the app owner, trainpacelab.com, 11:17–11:18 AEST. Screenshot inspection is evidence of current production UI only, not a verification of provider data provenance.

## Release order and acceptance criteria

1. **P0 — Unblock bottom tabs (this branch).** Remove the dashboard-only floating Beta feedback control which overlays Workouts/Calendar on narrow screens. Keep the existing Account menu > Feedback entry and modal. Acceptance: all four bottom tabs visible and tappable on 390px mobile; feedback still reachable via Account menu. No training data or backend changes.
2. **P0 — Publish and verify.** Test, checkpoint and merge the production app branch. Deploy the resulting *new* checkpoint, not a checkpoint tied to the older git commit. Confirm deployed checkpoint/hash, published URL and actual mobile screenshots; do not equate API acceptance with visible UI. Roll back to prior checkpoint if necessary.
3. **P1 — Coaching density.** Show a brief deterministic-data-grounded summary with an explicit Expand details action for the full AI assessment/highlights. Preserve complete text and accessibility. Validate no ungrounded claims.
4. **P1 — Coach hold.** Audit origin, persistence, effective dates, user-visible explanation and resume/review actions. Do not auto-clear a hold or prescribe running until a verified state transition. Verify on isolated test account.
5. **P1 — Daily dashboard hierarchy.** Prioritize readiness, today's plan and connection status; move screenshot OCR and long recent-session lists into expandable sections while retaining one-tap import/workout access. Check 390px, keyboard and reduced motion.
6. **P1 — Metrics provenance.** Audit CTL/TSB, engine size, threshold pace and readiness: timestamps, sources, sample density, units, estimated vs measured labels, missing HRV/sleep. Do not alter physiology equations without regression cases.
7. **P2 — FIT ingestion acceptance.** Verify Garmin/COROS original-file retrieval, stream sample count, persistence, failure and retry on staging synthetic data. Preserve GitHub approvals and provider restrictions.
8. **P2 — Performance.** Record bundle sizes and route loading; split heavy modules where useful, then compare before/after build metrics and mobile layout.

## Constraints
- Protect Odysseus and production athlete data.
- Keep staging and production deployment states explicit.
- Automated build/typecheck/tests are required before merging; real authenticated mobile screenshot verification remains a separate acceptance step.
