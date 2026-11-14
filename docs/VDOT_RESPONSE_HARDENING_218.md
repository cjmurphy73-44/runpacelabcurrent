# VDOT task 2.18 checkpoint

## Exact CI
PR #184 SHA `281a2e01f5808c87552f31f11f8d5634df3f508a`, Actions run `43645220923`: SQLite passed; Vitest failed before loading two VDOT suites due to malformed regular expression in `base44/shared/vdotPresentationBoundary.ts` line 40. Other five suites executed 25 tests, all passed. Typecheck and IP gate were skipped after Vitest failure. Vercel status points to build-rate-limit.

## Corrections
Removed accidentally doubled regex escapes that caused esbuild parse failure; require canonical UTC timestamps, reject invalid calendar rollover and ambiguous offsets; enforce pace seconds 00-59. Added regression tests for malformed timestamps, extra nested fields and invalid pace formatting. No protected formulas, live endpoints, feature flag or athlete data changed.

## Read-only Base44
Both staging and production backend-function list endpoints returned truncated results. This **does not** establish which function revision is deployed or which backend tenant it serves. Prior entity-schema queries found no RaceResult in either app. No backend calls, synthetic writes, secrets or deployments.

## HOLD
Exact new CI unverified. Preserve IP gate, Odysseus, disabled RaceResult writes. Do not merge, deploy, provision paid resources or modify production.
