# Private health and athlete-science hosted acceptance

**Environment:** Base44 private staging app `6aefe9d09e2788fc8591c758`.
**Release state:** `ATHLETE_HEALTH_JOURNAL_ENABLED` must remain unset or `false` until
the privacy owner has approved retention, delete/export and authenticated access
tests. Do not use an actual patient's or athlete's reproductive-health data.

## Preconditions

1. Record the exact staging checkpoint and rollback reference. Verify the staging
   schemas `AthleteHealthConsent` and `AthleteHealthJournal` remain admin-only
   for direct create/read/update/delete. Verify zero unexpected existing journal
   records and no health-journal enablement secret.
2. Use two **separate dedicated synthetic** Base44 athlete accounts (A, B), one
   coach-only account C, and a production-independent staging login. Never use
   actual health data or a real athlete's workout file without explicit consent.
3. Record test account identifiers **only in private evidence**, not GitHub,
   screenshots or function logs. Do not record session cookies or API tokens.
4. Confirm the enabled test environment has a defined time-limited deletion/
   version-history retention policy. Base44's ordinary entity delete is a
   **soft-delete** into trash and may retain version-history snapshots. Until
   an authorized purge process exists, the UI must not promise permanent erasure.

## Hosted journal checks (blocked while feature disabled)

Before enabling: as A, request `athleteHealthJournal` with `status`,
`enable`, and `save`. Expect a disabled result with **zero journal writes**
and no health entries. Check C and unauthenticated requests are denied.

After privacy approval, only on a dedicated restricted staging test environment,
temporarily enable and execute all of these using synthetic sample dates/labels:

| Case | Request | Acceptance evidence |
|---|---|---|
| 1 | A: status then list/save before consent | No health rows written; save denied |
| 2 | A: enable without acknowledgement | Denied; no consent created |
| 3 | A: enable acknowledged | One owner-scoped consent, versioned and not coach-shared |
| 4 | A: save synthetic entry, reopen, update same date | One owned row updated, no duplicate date |
| 5 | B and C: try list, export, delete for A | No A data disclosed; zero A data changes |
| 6 | Anonymous: status/list/save | Denied; zero writes |
| 7 | A: export | Complete owner-scoped JSON, `Cache-Control: private, no-store` |
| 8 | A: delete_day | Row absent from active list; B journal unchanged |
| 9 | A: erase_all without `DELETE` | Denied; records unchanged |
| 10 | A: erase_all confirmed | All active rows removed and consent withdrawn |
| 11 | Inspect trash and version-history policy | **Document retained copies**, purge process and expiry; do not claim hard erasure |
| 12 | Disable feature and verify again | New consent and save denied; existing owner export and active deletion remain available |
| 13 | A: disable after saving an entry, then export and erase | Export returns complete owner data, active records removed, no new write or opt-in allowed |
| 14 | Simulate deletion acknowledgement without removing a record | Operation fails closed and does **not** revoke consent or claim deletion success |
| 15 | B or C: attempt disabled-state export of A's entries | No A data disclosed; never rely on platform-admin token for this test |

Run checks both by hosted HTTP invocation and through the Recovery Center at
375px and desktop, including keyboard operation and light/dark themes. Ensure
the journal cannot be reached through coach access or the general AI context.
The access checks must assert both HTTP response and database side effects.

## Athlete intelligence hosted checks

Use synthetic, independently generated full/summary/incomplete workout histories,
then explicitly permitted genuine FIT/COROS/Garmin recordings when available.

- **Zero saved workouts:** no invented readiness, modelled fitness or trends.
- **Single workout:** CTL/ATL model labelled insufficient rather than mature.
- **At least 7 distinct days:** illustrative calendar model; missing days marked
  unobserved unless separately confirmed rest.
- **Mixed running/cycling/swimming:** TRIMP and TSS remain separate and changes
  preserve sport identity.
- **6 matched workouts across 3 older and 3 newer dates:** descriptive
  run-speed or bike-power comparison only when HR and duration are similar.
- **Summary-only or partial telemetry:** no verified stream-derived conclusion.
- **Duplicate import or sync retry:** same saved session id counted once.
- **Auth and privacy:** A's observations never visible to B, unassigned C, or
  anonymous callers. Neither health-journal consent nor entries appear in API
  output, AI prompts, browser telemetry, provider sync logs or export payloads.
- **Failure testing:** timeout, invalid dates, pagination overflow or entity
  read error yield explicit `unavailable`, never partial confident metrics.
- **Reference comparison:** test 42/7-day decay against an independent
  exponential recurrence and compare recent athlete-session totals to existing
  workout history. Document numerical tolerances and known model burn-in.
- **Timing:** measure p95 endpoint latency on representative history. Do not
  automate AI work until service-side deduplication and spending controls pass.

## Release decision

Only after signed evidence of the above: review data-retention wording and
privacy documentation; verify staging `main` contains the exact source;
complete real-device and authenticated browser acceptance; preserve rollback
checkpoint; then separately approve any production deploy or health-journal
feature enablement.

**Never use an admin API query as a substitute for testing the real athlete's
authenticated identity and coach isolation.** The Base44 platform connector
may have permissions unlike the web app's user session.
