# Base44 support request: TrainPaceLab-Staging isolation and legacy worker revision evidence

**Status:** Prepared for manual submission through an authorized Base44 support channel. No support ticket has been submitted by this task.

**Subject:** Request for written confirmation of staging data/auth/function boundaries and stale legacy function deployments

Hello Base44 Support,

We are conducting read-only acceptance of an independent application, **TrainPaceLab-Staging**, app ID `6aefe9d09e2788fc8591c758`. Our separate production app is `6a504ebe6a5a6d1be058226c`. Please confirm the following **without exposing credentials, tokens, secrets, athlete records or user PII**:

1. **Database:** Are the two app IDs guaranteed to use separate entity databases and row-level-security namespaces? Does the builder preview/testing agent use a separate dev/test database from the *published staging* app? Which backend environment does each of the staging preview URL, published staging URL and testing-agent session reach? Please supply a stable non-secret environment identifier or official documentation.
2. **Authentication:** Are authentication tenants, OAuth redirect/session boundaries and user identity namespaces independent between these two apps? Is the temporary testing-agent user guaranteed to authenticate against staging dev/test data when the test execution is started with an **explicit published staging URL** rather than the normal preview URL?
3. **Function routing:** What exact backend origin, app ID and function deployment/revision serve `/api/functions/reviewRestDays`, `/api/functions/calculateBanisterModel` and `/api/functions/calculateTrainingLoad` on **staging preview** versus **published staging**? Does a staging source-file edit/redeploy update both targets? Can old named routes retain an earlier bundled worker despite successful redeploy? Please provide a supported, read-only method to retrieve the effective deployed revision, not merely the sandbox Git revision.
4. **Worker errors:** The staging-app published-function logs from 2026-11-14 08:33–10:43 UTC include `calculateBanisterModel` errors about undefined `durationMinutes` and `calculateTrainingLoad` errors about undefined `dailyTSSHistory`, both from `_bundled.mjs`. The current staged GitHub handlers return fail-closed 503 without performing those calculations. A temporary newly named function using the same fail-closed Banister source returned GET 405 / POST 503, while the original named route returned 500. Please identify the effective deployed revision and whether stale route metadata or deployment cache can explain the mismatch. Do not change or redeploy functions without our authorization.
5. **Preview browser:** The Base44 test agent twice remained on “Preview is starting up”; a test on the published staging URL reached the login screen but did not authenticate. Please provide the supported read-only procedure for an authenticated temporary test user that can verify UI, owned/foreign athlete authorization and zero-write evidence entirely inside an independently isolated dev/test namespace.
6. **Auditability:** The entity count API reports RLS-visible published-app records and cannot prove a test-database zero-write delta. Data version history returned `needs_upgrade`. Is there a supported read-only, non-PII test-data audit or environment-specific record-count method?

Please respond in writing with which boundaries are **guaranteed**, which are configurable, and which cannot be verified using current platform tooling. A statement that the app has a different ID or the sandbox reports ready is insufficient for our release gate.

We will not merge, deploy, write athlete records, or enable unvalidated training-load calculations while these isolation questions remain unresolved.

Thank you.

---

## Internal evidence and next action

- GitHub draft PRs: #149 (declared Preview identity), #172 (independent isolation evidence), #175 (function log evidence); this Science 2.3 branch adds exact-deployed-revision evidence tests.
- PR #175 exact-head `f521215916eb5301eafc788e7075038a3917d755` passed GitHub Actions run `43642579460`.
- Before-work staging checkpoint `6af8d38fdb87a1e492ab7849`, sandbox revision `389f8b5b78af760e2f7ae0f26fe04ecea29903e7`. This differs from the earlier Science 2.2 revision, so do not assume no concurrent staging source changes.
- Read-only logs queried via Base44 `functions-mgmt/{function_name}/logs`, explicitly scoped to staging app and `env=preview` or `env=prod` (the latter means *published staging app*, not TrainPaceLab production).
- Published staging logs: Banister 9 historical errors; TrainingLoad 11 historical errors; rest review none in the queried interval. Preview logs were empty for all three. Empty logs do not prove worker health.
- `GET /api/apps/{app_id}/backend-functions` returned `{truncated:true}`, so per-function deployment revision and route mapping could not be verified.
- **Manual submission required** unless an authorized support-channel action becomes available. No credentials, PII, live athlete requests, or backend writes are needed.

**Acceptance remains blocked:** exact effective origin, database namespace, auth tenant, testing-agent routing, function deployment revisions and zero-write evidence are unproven. Existing fail-closed rest-confirmation and legacy science guards remain enabled. No merge or production deployment.
