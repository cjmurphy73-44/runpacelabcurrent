# VDOT task 2.20 checkpoint

## Exact upstream CI
PR #187 SHA `c49079716722279cec6996ff9bb5132088cc2a3d` returned **no pull-request-triggered workflow runs** from the available GitHub commit workflow lookup. Its Vercel combined status points to the build-rate-limit upgrade page. Therefore no exact-head test or typecheck success can be claimed for #187. The VDOT workflow has a pull_request paths filter for race tests, infra and the workflow file; #187 changed only a shared TypeScript module and docs, which plausibly explains why it did not trigger. The new branch modifies a matching race test path to request fresh CI.

Last executed upstream PR #186 run `43650519032`: SQLite PASS, Vitest 37/37 PASS, typecheck FAIL on five TS2339 pace fields; #187 contains the targeted JSDoc narrowing fix, not yet verified.

## Groundwork
Extracted `hasVerifiedVdotOwner` to a separately testable predicate, requiring nonempty authenticated user ID, nonempty owned athlete ID, and strict boolean `ownedAthleteVerified === true`. Added synthetic negative cases for missing identity, missing athlete, false/string flags and blank IDs. The still-disabled boundary uses the predicate; no backend function, math, client imports, data or feature flag changed.

**Security caveat:** The predicate cannot establish ownership by itself. Only a server-side authenticated lookup against the caller's owned athlete may set the verification flag. No client-supplied verification flag may be trusted. The disabled code path remains 503 before authentication or calculation.

## Staging isolation
Read-only Base44 status and entity schemas previously showed separate app IDs and no RaceResult schema, while backend function listings were truncated. No authoritative independent authentication, database, secrets or function-routing evidence exists. No function invocation or synthetic writes performed.

## HOLD
Await exact-head CI, then investigate any confirmed failure. IP gate intact, Odysseus untouched, RaceResult mutations disabled; no merge, deployment, paid resource or production changes.

## Task 2.21: exact-head repair and trust boundary

At original PR #189 head `d2f2ba305574a1be92a8ab770e635302979f8cf0`, VDOT workflow run #7 / `43651376312` reported `sqlite=SUCCESS`, `vitest=FAILURE`. Job logs showed the committed race Vitest suite passed but TypeScript TS2339 failed on five `secPerKm`/`formatted` accesses in the shared boundary. Therefore prior JSDoc type-narrowing was **not** proven effective. Replaced pace candidate with an index-signature record plus explicit numeric type narrowing; exact-head CI evidence must determine whether this succeeds.

The former `hasVerifiedVdotOwner(identity)` only checked a self-reported `ownedAthleteVerified: true` flag. That property alone is not evidence of an authenticated, owned athlete, even if the name implies it. The disabled boundary now requires a distinct injected `verifyOwnedAthlete(identity)` server dependency. Its result must bind the authenticated user's ID to a verified nonempty athlete ID, and client identity flags are ignored. Only that server-resolved athlete ID would be sent to a future calculate callback. This **does not implement a real database ownership lookup**: a future Base44 server adapter must derive the user from verified provider session context and enforce the caller's actual `AthleteProfile` ownership/assignment before returning a trusted result. The interface is a contract, not an authorization attestation. All VDOT functionality remains disabled by the hardcoded false constant and no handler is deployed.

Synthetic tests cover forged flags, owner/athlete mismatch, blank resolution, missing authorization resolver, and zero auth/resolver/calculate calls under disabled mode. VDOT workflow now includes the shared TypeScript boundary and its evidence doc in pull-request path filters, preventing shared-code-only changes from silently escaping the dedicated test workflow. The frontend IP import gate remains a required step after typecheck.

## Read-only Base44 staging identity evidence

Base44 app metadata lists independent IDs: production `6a504ebe6a5a6d1be058226c`, staging `6aefe9d09e2788fc8591c758`. Read-only `get_app_status` reports production `ready` version `3f386d4d52042940cb1767e6950ec78e33b3c81e`, staging `ready` version `63c5aff20dc8d4ca3658841209ec3f9bd1c24f29`. Staging branch list contains only main; production has multiple separate active branches. This establishes **app/version separation**, not independent storage, auth tenancy, function routing, OAuth callback binding, secrets, webhook destinations or runtime isolation. No Base44 functions were invoked; no database, production or staging writes occurred. Enablement requires authoritative provider-scoped configuration and isolated synthetic cross-tenant negative verification, with no production athlete data.

## Task 2.21 HOLD

Do not enable the VDOT feature flag, publish server routes, write RaceResult data, merge/deploy or modify production. Preserve Odysseus and frontend science IP boundary. The exact new PR SHA and CI outcome are recorded in the PR checkpoint when available.
