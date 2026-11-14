# Science 2.6: read-only acceptance evidence and manual support handoff

## GitHub reconciliation

- Draft PR #181 exact SHA `50bd81a06b80c8b17e63cb9eea025e7aa7172698` passed CI run `43644622363`.
- Open draft dependencies: #149 at `5c2aa62325302bd2d12c8d8e6d30dfcded22d390` (CI `43644576816` success), #172 at `533a5f42` (CI `43641347755` success), #175 at `f5212159` (CI `43642579460` success), #177 at `0d939e6a` (CI `43643565708` success), #179 at `c975ff9f` (CI `43644133124` success). All target main individually but the science PRs contain stacked dependencies. Do not merge individually without integration review.
- The prework staging checkpoint is `6af8d81d55d14fe7ab1868a4`, revision `f45dda54aaea430223d746f83947db4bd3745ee2`. A second read-only status check reported the same revision. Earlier Science 2.5 checkpoint was `040ac54a`, so there was an intervening staging sandbox revision change not attributable from the available evidence.

## Platform evidence and limitation

- Base44 API catalog offers testing-agent execution metadata and function logs, but no verified support-ticket submission operation or independent per-route deployed revision. The backend function list previously returned `{truncated:true}`.
- Read-only test execution `6af83c91a23233e22ea34416` is app-scoped to staging and shows `site_url=https://train-pace-lab-copy-8591c758.base44.app/Physiology`, `flow_role=user`, `status=failed`, `goal_accomplished=false`, `failure_reason=platform`, sandbox commit `18cf83fa85d84c228d99ac38ecc3ea0159f80204`. This proves a published staging URL was attempted, **not** a successful temporary-user authentication or isolated test-data route.
- The effective database namespace, auth tenant, test-agent data source, SDK origin, and named worker deployed revisions remain unverified. No athlete records were accessed, and no backend writes were issued.

## Safe regression improvement

`base44/shared/testAgentProvenance.ts` provides a pure fail-closed acceptance check requiring exact requested and effective staging app IDs, independently attested isolated-test database and auth environments, a temporary user, and a zero-write audit. Six synthetic tests reject missing evidence, production fallback, published data/auth, unknown environment, absent audit and unattested claims. This **does not** itself generate independent platform evidence or enable E2E tests.

## Manual support handoff

Use the existing complete draft `docs/SCIENCE_2_3_BASE44_SUPPORT_REQUEST.md`. In addition, ask Base44 to explain whether an explicit published staging `site_url` causes the test agent to use published data/auth instead of the isolated test environment, and to supply a stable, non-secret attestation for each environment and worker revision. No support request was submitted. No production, Odysseus, staging source or athlete data changed. Keep rest confirmation and legacy calculations disabled.
