# Science 1.4: historical coverage and explicit rest review

Status: stacked on Science 1.3 (#142). Draft, not production-ready.

## Provider sync audit

- Garmin historical sync and COROS historical sync report sync status, but neither provides independently verified **per-calendar-day absence-of-activity** evidence across all athlete devices, manual workouts and provider outages.
- COROS can return partial sync outcomes and uncertain writes. A successful OAuth connection, recent `last_sync_at`, or zero fetched activities does **not** prove a day was rest.
- The current Base44 entity filter is capped. The review API queries each date individually and refuses reads at the 500-row boundary, rather than assuming a truncated response is complete. It still requires provider-specific cursor/pagination verification for production.
- Cross-provider duplication and a concurrent new recording remain possible. There is **no verified atomic uniqueness constraint** between rest declarations and session ingestion.

## User workflow

1. Physiology Lab shows 14 completed UTC calendar days, including recorded, incomplete-load, confirmed-rest, conflict and unknown states.
2. Missing days stay **unknown**. No provider status or empty query automatically confirms rest.
3. The athlete can explicitly confirm a single unknown day after acknowledging they did no training, including unrecorded workouts.
4. The authenticated backend re-reads the day, checks ownership, date validity, read completeness, existing workouts, and duplicate DailyMetrics rows. It stores the declaration with `confirmed_rest_source='athlete_declaration'` and `confirmed_rest_at`.
5. It does **not** automatically recalculate CTL/ATL, modify a plan, or make a training recommendation. A separate validated recomputation workflow remains required.

## Remaining release blockers

- **Atomic concurrency**: a workout could be imported between the final read and declaration write. Resolve with a server-side transaction/unique-day reservation or reconciliation and a hard gate on recomputation. This draft does not claim to solve that race.
- **Timezones**: current review uses UTC dates. Implement athlete-local calendar dates with stable source timezones before releasing broadly.
- **Provider completeness**: verify pagination, historical lookback and partial-sync semantics for Garmin/COROS/Strava and file/manual ingestion. No provider sync currently proves rest.
- **History span**: the UI previews only 14 completed days, and the API limits requests to 31 days. Older history needs safe incremental review and backfill without bulk automatic rest classification.
- **Permissions**: the endpoint uses athlete ownership. Coach review and approval are not yet enabled; confirm policy before adding.
- **Data integrity**: run staging tests for duplicate DailyMetrics, 500-row limits, partial syncs, concurrent imports, RLS, device timestamps, and athlete confirmation after a newly imported workout.
- **Science 1.3 dependency**: #142 must be integrated and verified first. Existing CTL/ATL values are not retroactively trustworthy solely because the review UI exists.

## Safety contract

`confirmed_rest` means **athlete-declared no training**. It does not mean a provider independently verified inactivity. Unknown days remain unknown. A conflict with a recorded session invalidates rest for calculations. A missing session load is not a zero-load workout.
