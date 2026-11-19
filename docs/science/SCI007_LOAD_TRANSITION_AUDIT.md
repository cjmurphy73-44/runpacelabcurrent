# SCI-007: isolated verified-load transition audit (draft)
Pure offline Node reference checker for daily 42/7 EWMA transitions. It checks only the **verified-stream lane** and accepts summary-derived daily load as separate provenance. A summary-only day cannot create verified load. Detects mismatched CTL, ATL and TSB, missing or duplicate dates, impossible dates, negative/nonfinite inputs, and mutation. Does not alter the existing production load engine or expose private athlete records.

Run independently: `npm run test:ci (Vitest discovers scripts/science/load-transition-audit.test.mjs)`.

**Limitations:** This is a synthetic mathematical contract, not integration acceptance, production-data analysis, a diagnosis of issue #40, or proof that existing CTL writers use the same convention. Initial states, missing-day handling, per-day aggregation, historical revisions and provenance must be reconciled with backend ownership before any integration. No production writes, no schema changes, no secrets, no deployment. Release HOLD.
