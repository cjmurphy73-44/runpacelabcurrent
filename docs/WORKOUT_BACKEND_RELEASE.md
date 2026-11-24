# TrainPaceLab workout backend release

Deploy the Base44 resources and Vercel frontend from the same reviewed candidate. A GitHub merge can trigger Vercel production independently of Base44 publication. Keep the existing Vercel production deployment available for rollback.

## Contracts to preserve

| Boundary | Compatibility requirement |
| --- | --- |
| WorkoutSession | Add walking and optional provider identity, training-load provenance and sample power. Keep all existing enum values, row permissions and required fields. Preserve existing Other workouts and all saved streams. |
| Manual workout | Legacy clients can still create the same WorkoutSession payload. The coordinated client uses logManualWorkout, which checks athlete ownership and reports storage and derived-load refresh independently. |
| FIT and CSV imports | Keep the legacy workout ID, duration and estimated load fields alongside the current workout response. Once a session is committed, a load-refresh or first asset registration failure can be recovered from the stored workout and raw file reference. |
| History and daily load | Retain persisted workouts and their dates. The new optional load columns distinguish measured and estimated inputs without rewriting legacy records. Read back the created workout and the daily total in acceptance. |
| Active plan | Verify the replacement schedule before activating it. Retire pending future sessions only for the previous active plan after its archived status is confirmed. Retain historical and completed sessions. |
| Coach analysis | Accept workout_id and the legacy workout_session_id, reject conflicting values and verify athlete ownership before service-role evaluation. Verify assigned-coach reads and unrelated-athlete denial against existing row policies. |
| Auth and routing | Keep Base44 session issuance and existing account IDs. Vercel must explicitly target the intended Base44 app ID and API origin. Direct registration, workout detail and legacy /activity/:id coach links must serve the SPA and API failures must remain API responses. |
| Original COROS FIT | Store protected original bytes for an exact provider activity ID in an isolated generation. Confirm exact SHA-256 readback before publication. Each read verifies the archive before returning samples, and the UI shows elapsed-time coverage independently of checksum verification. |

## Staging and production order

1. Record the Git commit, Base44 checkpoint, existing Vercel production deployment and current app IDs. Export a recoverable snapshot through the approved Base44 data workflow before any non-additive change.
2. Deploy optional fields on WorkoutSession, AthleteProfile and DailyMetrics and add the admin-only CorosRecordingArchive entity. Preserve staging’s existing recording_provenance field. Update the workout, reset and account deletion handlers before enabling original FIT writes.
3. Deploy the reviewed SDK handlers. Reconcile the staging-specific COROS callback and recording-failure behavior separately before replacing any existing historical or webhook handler. The corosRecording endpoint adds archive recovery independently of those handlers. Preserve the registered COROS redirect and the current credentials, connections and OAuth scopes.
4. Keep COROS_FIT_ARCHIVE_WRITES disabled until staging authorization, exact provider identity, storage, cleanup and readback checks pass. Enabling it requires the value `enabled`. Reads of preexisting archives continue to work with writes disabled.
5. Run the staging acceptance script and browser acceptance with the exact frontend preview, including registration, onboarding, import, history, plan and coach views. Check legacy and current request payloads. Record the platform versions and confirm resource hashes against the candidate. A 401 from the hosted function only establishes endpoint availability and unauthenticated denial.
6. Publish the additive backend first and verify existing frontend compatibility. Promote the matching Vercel frontend after the backend checks pass. Keep new archive writes off until production verification and monitor lag, failed imports and authorization errors.

## Executable staging acceptance

Run `node scripts/verify-base44-staging-workouts.mjs` using a dedicated staging test athlete, an unrelated staging athlete and an assigned staging test coach. Provide their authorized sessions as `TPL_STAGING_ATHLETE_TOKEN`, `TPL_STAGING_OTHER_ATHLETE_TOKEN` and `TPL_STAGING_COACH_TOKEN` through a private environment. Keep tokens out of logs and source control. The test creates and removes two synthetic workout fixtures and checks existing plan and coach access. Supply a confirmed, authorized long COROS workout and independently checked reference data in `TPL_STAGING_COROS_WORKOUT_ID`, `TPL_STAGING_COROS_SAMPLE_COUNT`, `TPL_STAGING_COROS_LAST_SECOND` and `TPL_STAGING_COROS_SHA256`. Recovery persists an archive for that workout. Archive input is limited to 2 MiB and 28,800 decoded samples per request. The test pins the existing staging app and never sends these sessions to production.

## Rollback

Disable archive writes first if the recording path regresses. Restore the verified Vercel deployment independently. If the backend must roll back, restore reviewed handler versions while retaining additive schema fields, the walking enum and any archive rows already written. Removing the new enum after walks have been saved could make existing rows invalid. Preserve plans, workouts, provider connections and archive data during rollback. Record the actual published revisions and repeat the smoke checks after rollback.
