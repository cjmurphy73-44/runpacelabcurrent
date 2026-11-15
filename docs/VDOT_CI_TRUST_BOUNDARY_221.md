# VDOT task 2.21: CI coverage and trust-boundary reconciliation

## Exact-head run
Draft #189 original checkpoint `d2f2ba305574a1be92a8ab770e635302979f8cf0`: GitHub Actions #43651376312 reported SQLite PASS, Vitest **38/38 PASS**, and five TS2339 pace field errors; the IP gate was skipped. Vercel combined status linked to build-rate-limit.

## Concurrent edits reconciled
When creating this branch from `science/audit-134-vdot-owner-identity-tests`, its fetched contents already contained further concurrent work beyond the original #189 checkpoint: `const pace = candidate as {secPerKm?: unknown; formatted?: unknown}` followed by explicit runtime `typeof` checks, a separate `verifyOwnedAthlete` injected dependency and negative ownership tests, and a path filter for the shared contract. Those changes are retained and **not claimed as authored by this branch**. Their exact-head typecheck needs confirmation.

This PR makes only a narrowly justified CI trigger correction: replace single-file shared-contract and documentation filters with `base44/shared/vdot*.ts`, `base44/shared/race*.ts` and the existing frontend IP review script. Existing SQLite, Vitest, typecheck and IP gate commands are unchanged. The new workflow still intentionally fails the IP gate while the protected browser imports are unresolved.

## Trust boundary
`verifyOwnedAthlete(identity)` is a dependency-injected server-side capability; the current helper cannot verify that its return value really came from a persisted ownership lookup. Even a `verifiedByServer: true` property alone is not cryptographic or platform proof. No feature enabling or production invocation is authorized. A future route must independently authenticate, look up owned profile, reject ambiguity, enforce request bounds, supply server-derived provenance and use server-only science.

## Base44
Prior read-only backend-function listings were truncated, and distinct app IDs/versions plus missing RaceResult schemas do not prove independent data, auth, secrets or runtime function routes. No call to a live function, secrets API, or entity write was made.

**Release HOLD:** RaceResult mutations and server presentation disabled; no IP gate bypass, merge, deployment, paid resources, production or Odysseus modifications.
