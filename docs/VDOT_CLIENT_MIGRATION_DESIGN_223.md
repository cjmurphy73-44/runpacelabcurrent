# VDOT task 2.23: frontend migration without science leakage

## Verified PR #227 evidence
Commit `606cbb7e44298d4703cf5338a13b92af501371b8`, GitHub Actions `43770524491`: SQLite PASS, 7 Vitest suites / **43 tests PASS**, typecheck PASS, protected frontend IP gate FAIL by design. Vercel deployment `dpl_Hmz4WnVWjecEQcZGqG1rAeWQrP1a` is ERROR on **the exact same SHA and branch**; build log pinpoints `scripts/check-client-science-imports.mjs` blocking `components/NorwegianIntervalPlanner.tsx` and `lib/physiologyEngine.ts`. No test/typecheck defect to fix.

## Design and scoped implementation
New `src/lib/vdotPresentationClient.ts` is presentation-only, disabled by default, with discriminated unavailable/loading/ready/error state and strict request correlation keys to avoid accidentally showing an older format or VDOT response. It has **no** proprietary math, science imports, SDK calls, network calls or athlete-data access. Four synthetic regression tests exercise default unavailability, invalid inputs, distinct format correlation and non-fabricated output. The tests are included in the targeted workflow.

**This draft deliberately does not migrate the two existing consumers.** `NorwegianIntervalPlanner.tsx` still calls browser `norwegianEngine`; `physiologyEngine.ts` still calls browser VDOT. Simply swapping the imports for an unavailable placeholder would hide functionality and might be mistaken for a working production migration. Release stays blocked until the authenticated server endpoint and response validation are proven, plus a UI treatment for loading, unauthorized and unavailable results.

Architecture after isolation proof:
1. An authenticated Base44 backend function resolves server session identity and persists an exact owned-athlete relationship, never using caller-supplied identity or flags.
2. It computes through server-only shared deterministic VDOT and Norwegian science; returns bounded schema with provenance/model version/timestamp and no private identifiers.
3. A client SDK adapter requests the validated result and correlates it to the latest request. Both browser consumers render server results or explicit unavailable state; never calculate locally, fabricate fallback values or duplicate formulas.
4. Remove the two blocked imports and prove the source-map/bundle science gate, typecheck, full tests, lint and production build before any staging trial.

## Read-only Base44 isolation
Prior read-only staging and production status/schema checks show independent app IDs/versions but no RaceResult schemas. Function list responses truncated. No authoritative proof yet of separated auth, DB, secrets, functions and routing. No live functions or writes invoked.

## Release
**HOLD**. No merge, deployment, paid provisioning, secrets access, backend function call, production/athlete data change or Odysseus modification. Race-result mutations remain disabled.
