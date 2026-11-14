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
