# VDOT task 2.16: server-owned presentation boundary groundwork

## Reconciliation and exact CI
Draft #180 SHA `4911b54bfcbef33f66916cd863fbdb7b96658454`, Actions run `43644507687`: SQLite passed, selected Vitest passed, typecheck passed, frontend IP import gate failed as intended. Vercel combined status linked to build-rate-limit page. No confirmed compiler/test failure to fix.

## Existing function review
`base44/functions/physiologyCompute/entry.ts` already uses `createClientFromRequest(req)`, `auth.me()`, and an owned-athlete lookup; it imports server-owned `base44/shared/vdot.ts` for VDOT/paces. It also currently queries RaceResult even though read-only Base44 schema inspection previously returned no RaceResult entity for staging or production. Do not modify or invoke this live function until backend routing and entity availability are verified.

`base44/functions/submitRaceResult/entry.ts` has an early `RACE_RESULT_MUTATIONS_ENABLED=false` guard returning HTTP 503 before database writes. This is unchanged.

## Safe architecture
A future authenticated server function may accept `{kind:'paces',vdot}` or `{kind:'norwegian',vdot,format}`, validate the request, verify authenticated ownership and compute with server-only shared science. Response must carry deterministic display values, provenance, calculation version and explicit unavailable state. No client-supplied owner ID or fake result.

The current draft adds only `base44/shared/vdotPresentationBoundary.ts`: strict request validation, explicit `VDOT_PRESENTATION_ENABLED=false`, dependency-injected auth/calculation interface, and fail-closed 503 before invoking either dependency. No proprietary formula is copied and no route is deployed. Five authored Vitest tests verify default-off, finite input bounds, formats, owner spoof rejection, disabled no-call behavior and dependency validation.

The two browser imports in `NorwegianIntervalPlanner.tsx` and `physiologyEngine.ts` remain unchanged and blocked by the existing IP gate. Do not remove them before a tested authenticated replacement exists, and do not whitelist them to get a green build.

## Remaining blockers
- Execute exact new CI run and review any failures.
- Confirm Base44 staging/production database, auth, functions, secrets and integration isolation via authoritative read-only platform evidence.
- Verify server function routing and permissions, rate limiting, data provenance, response schema, request ownership and no unauthorized writes.
- Design a user-visible loading/error/unavailable state and migrate both consumers after server-owned function acceptance.
- Run full lint/build after IP-safe migration; current build is intentionally blocked.
- Preserve Odysseus, all production athlete data and disabled RaceResult writes. No merges, deployments or paid resources.

**Release HOLD.**
