# VDOT task 2.17: response provenance and ownership safety

## Exact upstream evidence
PR #182 exact head `6c4ea190500d0b494dfd104e8fbaca7470b67b62` GitHub Actions run `43645088964`: SQLite passed, selected Vitest passed, typecheck passed; IP gate failed as designed. Vercel status build-rate-limit, not proof of a compiler failure.

## Changes
The still-disabled `base44/shared/vdotPresentationBoundary.ts` now requires an authenticated identity with `ownedAthleteVerified === true` in its future enabled branch. A strict response validator accepts only bounded paces or a matching Norwegian prescription, exact requested VDOT, explicit provenance (`athlete_attested` or `manual_input`), model version and calculation timestamp. Rejects unexpected fields, including private athlete identifiers, nonfinite values, unexpected formats and malformed responses. Errors return generic unavailable, not provider details. The global feature flag remains false, so authentication and calculation are never called.

Five authored response regression tests added to the exact CI workflow. No formulas, browser science imports, Base44 routes, credentials, runtime integrations or athlete data changed.

## Read-only Base44 checks
Staging `6aefe9d09e2788fc8591c758`: status ready, version `f45dda54aaea430223d746f83947db4bd3745ee2`, main branch only in returned list, RaceResult entity schema list empty.
Production `6a504ebe6a5a6d1be058226c`: status ready, version `3f386d4d52042940cb1767e6950ec78e33b3c81e`, main and additional development branches, RaceResult entity schema list empty.
These results do not prove isolation of database, authentication, secrets, functions, integrations or function routing. No backend function invocation, synthetic writes or credentials accessed.

## Remaining gates
- Execute exact new CI and fix confirmed errors.
- Validate the provenance response model against actual server-owned functions; model version and timestamp must be server-derived.
- Independently verify staging tenant and backend function routing isolation before any route or synthetic data operation.
- Resolve protected frontend imports through an approved server-owned migration; never bypass the IP gate.
- Keep RaceResult writes disabled; no merge, deployment, paid resources, production modification or Odysseus changes.

**HOLD.**
