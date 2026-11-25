# TrainPaceLab workout backend release

Deploy the Base44 resources and frontend from the same reviewed candidate. The production `trainpacelab.com` domain is served by the published Base44 app `6a504ebe6a5a6d1be058226c`. Verify the live HTML and asset fingerprints before a cutover. Pull the protected GitHub `main` merge into Base44 and verify the publication checkpoint. Automatic Vercel builds are limited to designated `release/` branches.

## Contracts to preserve

| Boundary | Compatibility requirement |
| --- | --- |
| WorkoutSession | Add walking and optional provider identity, recording start time, training-load provenance and sample power. Keep all existing enum values, row permissions and required fields. Preserve existing Other workouts and all saved streams. |
| Manual workout | Legacy clients can still create the same WorkoutSession payload. The coordinated client uses logManualWorkout, which checks athlete ownership and reports storage and derived-load refresh independently. |
| FIT and CSV imports | Keep the legacy workout ID, duration and estimated load fields alongside the current workout response. Once a session is committed, a load-refresh or first asset registration failure can be recovered from the stored workout and raw file reference. |
| History and daily load | Retain workouts and their dates. Read all pages of load inputs, excluding full telemetry from the calculation query. Manual and single-file saves run the same calculation directly after persistence. A failed refresh reports a saved workout with stale metrics. Confirm both the saved workout and the recalculated daily total in acceptance. |
| Active plan | Verify the replacement schedule before activating it. Retire pending future sessions only for the previous active plan after its archived status is confirmed. Retain historical and completed sessions. |
| Coach analysis | Accept workout_id and the legacy workout_session_id, reject conflicting values and verify athlete ownership before service-role evaluation. Verify assigned-coach reads and unrelated-athlete denial against existing row policies. |
| Auth and routing | Keep Base44 session issuance and existing account IDs. Vercel must explicitly target the intended Base44 app ID and API origin. Direct registration, workout detail and legacy /activity/:id coach links must serve the SPA and API failures must remain API responses. |
| Original COROS FIT | Store protected original bytes for an exact provider activity ID in an isolated generation. Confirm exact SHA-256 readback before publication. Each read verifies the archive before returning samples, and the UI shows elapsed-time coverage independently of checksum verification. |

## Staging and production order

1. Record the Git commit, Base44 checkpoint, existing Vercel production deployment and current app IDs. Export a recoverable snapshot through the approved Base44 data workflow before any non-additive change.
2. Deploy optional fields on WorkoutSession, AthleteProfile and DailyMetrics and add the admin-only CorosRecordingArchive entity. Preserve staging’s existing recording_provenance field. Update the workout, reset and account deletion handlers before enabling original FIT writes.
3. Deploy the reviewed SDK handlers. Reconcile the staging-specific COROS callback and recording-failure behavior separately before replacing any existing historical or webhook handler. The corosRecording endpoint adds archive recovery independently of those handlers. Preserve the registered COROS redirect and the current credentials, connections and OAuth scopes.
4. Keep COROS_FIT_ARCHIVE_WRITES disabled until staging authorization, exact provider identity, storage, cleanup and readback checks pass. Enabling it requires the value `enabled`. Reads of preexisting archives continue to work with writes disabled.
5. Publish the exact saved checkpoint on the private staging app. A Base44 source checkpoint can contain newer function code than the app currently serves. Run acceptance against the published staging frontend, including registration, onboarding, import, history, plan and coach views. Check legacy and current request payloads, record published versions and confirm resource hashes. A 401 from a hosted function establishes unauthenticated denial.
6. Publish additive contracts first and verify existing frontend compatibility. Publish the matching Base44 frontend and scoped policies after verifying profile mappings. Keep new archive writes off until production verification and monitor lag, failed imports and authorization errors.

## Executable staging acceptance

Run `node scripts/verify-base44-staging-workouts.mjs --athlete-only` with an authorized `TPL_STAGING_ATHLETE_TOKEN` for a dedicated staging account with a completed profile and current daily load. This creates and removes two test workouts and checks walking persistence, legacy running writes and the change to the daily load. The script pins the private staging app.

For full acceptance, run without `--athlete-only`. Supply authorized sessions for an unrelated test athlete and assigned test coach as `TPL_STAGING_OTHER_ATHLETE_TOKEN` and `TPL_STAGING_COACH_TOKEN` through a private environment. Keep tokens out of logs and source control. The test checks isolation and access to an existing active plan. Supply a confirmed, authorized long COROS workout and independently checked reference data in `TPL_STAGING_COROS_WORKOUT_ID`, `TPL_STAGING_COROS_SAMPLE_COUNT`, `TPL_STAGING_COROS_LAST_SECOND` and `TPL_STAGING_COROS_SHA256`. Recovery persists an archive for that workout. Archive input is limited to 2 MiB and 28,800 samples per request.

## Profile and coach authorization cutover

1. Export a recoverable Base44 data snapshot before changing existing account permissions. Install the optional `User.verified_athlete_profile_id` field and `linkAthleteProfile` first. As an administrator, invoke `backfillOwnershipMapping` in dry-run mode and reconcile ambiguous or failed mappings. Apply only after confirming the mapping and retain the existing records.
2. With the new roster and linking functions available, switch the athlete entity policies and frontend together. The policies use the server-verified profile link, and coach access is checked against active, administrator-reviewed assignments on each request. Preserve legacy assignments as records. An administrator can approve an existing pair through `manageCoachRoster` after checking the coach's identity and the athlete's consent.
3. Verify that non-admin users cannot change verified links or grant assignments directly. Test ordinary entity reads and writes alongside the six protected functions. Check that revoking a coach immediately denies future roster and athlete requests.
4. Unused catalog entities should retain administrator-only access while records are held for retention review. Keep browser support and error reporting authenticated. Monitor Base44 function logs for request errors and keep automatic writes to Airtable out of request handlers.

## Billing release gate

Live checkout stays paused unless `STRIPE_PUBLIC_CHECKOUT` is `enabled` on the production app. Existing subscriptions can still receive live Stripe events and use the billing portal. Configure `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_PRO_PRICE_ID` and `STRIPE_TEST_WEBHOOK_SECRET` in private staging, and route the Stripe test webhook to that staging app. Verify paid checkout, access to a paid function, portal opening, cancellation and the subsequent entitlement update before enabling live checkout. Keep live billing secrets out of staging.

## Rollback

Disable archive writes first if the recording path regresses. Restore the prior verified frontend or publish a recovery checkpoint with the previous frontend and the security fixes. If the backend must roll back, restore reviewed handler versions while retaining additive schema fields, the walking enum and any archive rows already written. Removing the new enum after walks have been saved could make existing rows invalid. Preserve plans, workouts, provider connections and archive data during rollback. Record the actual published revisions and repeat the smoke checks after rollback.
## Recording recovery and scale checks

Recover a summary from the workout analysis page using an athlete-owned COROS connection and the workout's stored provider activity ID. Check a recording below the inline sample limit and one above it. For the shorter recording, verify that refreshing the workout preserves its ID, plan link and device calories and returns the restored samples. Verify that Home and the workout fitness card read the recalculated load. For the longer recording, verify that intervals reach the last samples and that the workout has no truncated inline stream. Check an unrelated signed-in athlete and an activity without a provider ID. Keep archive writes disabled for these checks. Original-file durability at larger sizes still requires the separate private archive acceptance.

Post-workout coaching reuses completed feedback, deduplicates concurrent requests within each worker and limits new calls per athlete within the worker. Cold workers can still race. Historical COROS sync and daily fitness recalculation still grow with the number of recordings and days replayed. The model sees workout and training metrics. The account identifier and raw recording stay out of the prompt.

Before expanding automatic coaching, measure peak sync concurrency, duplicate generation, p95 workout and coaching response times, provider throttling, load-recalculation write volume and model cost per active athlete. A target of 10,000 active athletes with three newly evaluated workouts each week would mean about 30,000 weekly model requests before retries and other AI workflows. Estimate spend using measured input and output tokens per request and the configured model prices. Measure plan generation, chat, race strategy and automatic adjustments separately. Carry automatic generation through a shared job store with a unique workout and evidence version, a shared budget, bounded concurrency and retry backoff. Record accepted job age and usage at the point of invocation so delays and spend can be explained.
