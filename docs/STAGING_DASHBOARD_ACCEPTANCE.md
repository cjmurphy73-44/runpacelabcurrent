# Staging dashboard acceptance identity gate

**Status:** source-only safeguard and opt-in preview runtime guard, not proof of backend isolation.

Before any authenticated preview browser QA, run `node scripts/check-staging-identity.mjs` with these **explicit, non-secret** environment variables:

- `STAGING_BASE44_APP_ID`: expected separate Base44 staging app ID
- `PRODUCTION_BASE44_APP_ID`: published Base44 app ID
- `STAGING_BASE44_BASE_URL`: expected staging HTTPS backend origin
- `PRODUCTION_BASE44_BASE_URL`: published HTTPS backend origin

The gate fails closed on missing/malformed values, equal app IDs, equal backend origins, insecure URLs or credential-bearing URLs. It prints only a reason code, not values. The positive case checks distinct *declared* identities, **not** actual SDK requests, Base44 tenancy, Vercel environment variable scope or RLS. Never pass secrets or athlete tokens to this script.

**Required independent evidence before QA:**
1. Verify the correct Vercel team/project and the exact preview Git SHA.
2. Verify the preview's **effective** `VITE_APP_ID` and `VITE_APP_BASE_URL` are staging-only. Inspect configuration safely without exposing values or credentials. Also verify any `VITE_BASE44_APP_ID` / `VITE_BASE44_APP_BASE_URL` consumed by the Base44 plugin.
3. Confirm `src/lib/app-params.js` published-ID fallback and URL/localStorage overrides cannot silently select production during preview. Until addressed and tested, mark preview isolation **BLOCKED**, even if this gate passes.
4. Verify a separate Base44 staging app and test athlete exist. Never reuse production athlete data or tokens.
5. Only then run authenticated 320/390/768/1024/1440px light/dark, keyboard, screen-reader and weekly-volume error/retry checks.

This gate is deliberately not wired into production build/deploy: production builds must not require staging environment values. No environment, schema or deployment is changed by this PR.

## Opt-in preview runtime guard (PR #149)

For a **separate preview deployment only**, set these explicit Vite build-time variables:

- `VITE_STAGING_PREVIEW_REQUIRED=true`
- `VITE_STAGING_APP_ID`: separate staging Base44 app ID
- `VITE_APP_ID`: same staging Base44 app ID
- `VITE_APP_BASE_URL`: staging HTTPS backend origin
- `VITE_PRODUCTION_BASE44_BASE_URL`: production HTTPS backend origin (for inequality comparison)

The guard runs before the Base44 SDK client is created. A missing/mismatched app ID, a conflicting `app_id` URL parameter, an absent base URL or identical staging/production origin throws instead of falling back to the published app. Stale localStorage app IDs are ignored in preview mode; a matching OAuth redirect continues to work. Production remains on the existing bootstrap path when `VITE_STAGING_PREVIEW_REQUIRED` is unset. Do not turn the flag on in production until independently reviewed.

**Limitations:** A deployment with the opt-in flag absent does not enforce this guard. When supplied, the runtime guard also rejects conflicting `VITE_BASE44_APP_ID` and `VITE_BASE44_APP_BASE_URL` values. Missing plugin values are not proof of isolation: verify the plugin's effective configuration independently. An HTTPS origin being different is not proof of tenancy isolation. Never promote or run authenticated QA without verifying effective deployment values and staging tenant ownership.

## Vercel preview build enforcement and provenance

The Vite configuration now calls `assertPreviewBuildConfig(process.env)` during configuration loading. On `VERCEL_ENV=preview`, a missing `VITE_STAGING_PREVIEW_REQUIRED=true`, missing `PRODUCTION_BASE44_APP_ID`, missing explicit staging identity, invalid/identical IDs or origins, or conflicting plugin identity causes a **build failure**. This prevents an unguarded Vercel preview build from silently falling back to the published Base44 app. Production and local builds are unchanged.

No preview can be accepted without a Vercel deployment record whose `meta.githubCommitSha` exactly matches the tested PR head. A READY deployment of a different branch is not acceptance evidence. Confirm that the Vercel preview build variables were actually set in the deployment and that the separate Base44 staging tenant is verified before any authenticated browser QA. The check does not inspect secrets or access athlete records.

Note: this policy intentionally blocks future Vercel previews until staging environment variables are configured. It is not yet merged or deployed; avoid enabling it on production.

## Verified account inventory, 14 November 2026

Connected Base44 read-only application inventory confirms **TrainPaceLab-Staging** (`6aefe9d09e2788fc8591c758`) and **TrainPaceLab** (`6a504ebe6a5a6d1be058226c`) are distinct applications; both report ready. This proves existence of a separate staging app, **not** its data isolation or any Vercel preview connection. No entity records were queried.

PR #149 at `e38b5e95e9bcdccaba69721f9d1aa7dd10682f1d` passed CI #651. GitHub's Vercel status still reports build-rate-limit. The Vercel project `runpacelabcurrent` is present, but no exact-SHA READY preview has been verified. Use `verifyPreviewProvenance` with a fetched Vercel deployment record and the full GitHub head SHA. Synthetic tests demonstrate rejection of stale, non-ready, production and missing-SHA deployments. The provenance helper does not itself query Vercel or attest tenant isolation.

## Preview acceptance verification checkpoint

At `df18225c71c9061454a251606c2872c380daf516`, CI #652 passed. A read-only Vercel listing found a READY deployment at `f0905fdd9f3304c2cf86301b8456574a0445a602` from this PR branch, **not** the tested head; it is therefore rejected for acceptance. No exact-head deployment was found in the latest 50 deployment records, and GitHub Vercel status continues to report build-rate-limit. The provenance validator now requires matching full SHA, branch and GitHub repository identity. Preview-only environment variable scopes still need independent verification; the existence of a separate Base44 staging app is not sufficient. No authenticated staging QA was performed.

## CI #656 and Vercel environment scope evidence

CI #656 failed because `scripts/verify-preview-provenance.mjs` contained literal escaped newline characters; commit `a1b7b4100e1fd8d136539678623fc1abcc6e1892` repairs this parser error. CI at that commit must be checked separately.

Read-only Vercel project environment metadata, with `decrypt=false`, returned exactly two **general Preview** variables: `VITE_APP_ID` and `VITE_APP_BASE_URL`. Filtering for `codex/rel-staging-identity-gate-20261114` returned **zero branch-specific variables**. Required `VITE_STAGING_PREVIEW_REQUIRED`, `VITE_STAGING_APP_ID`, `PRODUCTION_BASE44_APP_ID` and `VITE_PRODUCTION_BASE44_BASE_URL` were absent from the returned metadata. No values were requested or disclosed. Do not assume the two general Preview variables point to staging; no effective build-time staging identity has been verified. A new PR #149 preview should intentionally fail its build gate until scoped configuration is completed.

The confirmed Base44 staging app ID is `6aefe9d09e2788fc8591c758`; published production app ID is `6a504ebe6a5a6d1be058226c`. Configure **branch-specific Preview** variables only after confirming the staging backend HTTPS origin and deployment ownership. Do not overwrite general Preview or Production variables. Rebuild after configuration changes; old deployments retain prior environment values. Do not run synthetic connectivity or authenticated dashboard acceptance until exact-SHA READY preview and effective staging backend identity are verified.

## CI #658 and independent Base44 staging inspection

PR #149 commit `a1dc38d7cb2ab6d17f8543e15677872de31aef32` passed CI #658. The Base44 staging application is independently accessible through its app editor preview, but read-only inspection of its own `src/lib/app-params.js` found a **published production app-ID fallback** in that app copy. Its `vite.config.js` contains React plugin only; `src/api/base44Client.js` uses the SDK and app params. This is a material tenant-routing risk if the staging app itself is used for acceptance without isolated runtime configuration. No staging files, data or schemas were modified.

The editor preview URL identifies the staging app, **not** the Base44 SDK backend HTTPS origin. The origin is still unverified, so no Vercel branch-scoped variables were created and no synthetic connectivity was attempted. Required acceptance: verify the staging backend origin through the app's effective SDK bootstrap/network metadata without credentials, verify no production-ID fallback is reachable, then configure only branch-specific Vercel Preview variables and obtain exact-head READY deployment. General Preview and Production settings must remain unchanged.

## Staging-only Base44 correction, 14 November 2026

CI #659 passed at PR #149 head `2f0feb39ec05e37a63a2c49f836f247abe0fa312`. In the separate Base44 staging app `6aefe9d09e2788fc8591c758`, a pre-change restore checkpoint `6af82fa93ebb1e76afdb89de` captured revision `df3623cac2ebfc94eacbed87ef455f04d5bf349b`. Its `src/lib/app-params.js` was then changed **only in staging**: the published production app-ID fallback was replaced with the staging app ID, conflicting URL `app_id` is rejected, and a conflicting configured `VITE_APP_ID` is rejected. After-change checkpoint `6af82fcabb2b1fb48ec66d4c` captures staging revision `6de99e38ac9fa68a5b61b5b42906bb1226c78d66`. The staging sandbox `npm run build` completed successfully.

**Still blocked:** `app_base_url` can originate from URL/localStorage in the staging bootstrap. The effective SDK backend HTTPS origin and any stale persisted URL are not independently attested. A distinct app ID and successful build alone do not prove isolation. Do not configure Vercel branch-scoped backend variables from guessed origins or run synthetic connectivity until this is resolved. No Vercel environment settings, production code, schemas or athlete records were touched.

## Staging backend origin guard checkpoint

PR #149 CI #660 passed at `31bc920d74dbae11b62e1c268324b1510f281dd8`. Before modifying the separate Base44 staging app, checkpoint `6af83083bb66a0068c2b10e1` was created. In its `src/lib/app-params.js`, staging-only `resolveStagingBackendOrigin` now requires an explicit HTTPS `VITE_APP_BASE_URL` origin, rejects credentials, query, hash, path and explicit ports, and rejects URL/localStorage `app_base_url` values that conflict with the configured origin. It no longer uses persisted URL/storage as the SDK's selected backend origin. This is staging-only, not a production change. Staging `npm run build` passed; seven synthetic guard cases passed using isolated in-memory window/storage fixtures (no backend requests). After-change checkpoint `6af830bbc80547149bc73a33`, revision `f9be6fd85d59cde90df251f4de897b44bc44e952`.

**Important fail-closed consequence:** until the staging app's effective `VITE_APP_BASE_URL` is independently established and supplied, the staging frontend will block SDK initialization at runtime. The Base44 editor URL is not evidence of backend origin. No branch-specific Vercel variables were created, no authenticated backend requests were made, and no exact-head READY deployment was accepted. Staging URL/origin and OAuth redirect acceptance remain blocked pending safe independent origin evidence.

## Persistent staging backend-origin regression evidence

CI #661 passed at PR #149 head `7dcbf0d6ce88d25ace0e8954843c8c4fa35f6ed2`. In the **separate Base44 staging app only**, added `tests/staging-backend-origin.test.mjs` with 10 persistent synthetic tests for explicit HTTPS configured origin, matching URL/storage values, missing origin, conflicting production URL/storage after OAuth callback, and unsafe schemes/credentials/paths/query/ports. `node --test tests/staging-backend-origin.test.mjs`: **10/10 passed**. `npm run build`: **passed**. Base44 restore checkpoint `6af83ae985a7f233759e74a9`, revision `fe0777f0d828e40493f3a35b4aa37c3555db6731`. Tests use synthetic in-memory window/storage values, no SDK network requests or athlete records.

Read-only platform config files `base44.config.json` and `base44/config.jsonc` did not provide an independently attested staging SDK backend HTTPS origin. Base44 editor preview identifies the app but not its effective backend host. SDK documentation confirms `createClient({ appId })` for external clients, but does not prove this staging instance's runtime origin. Therefore **do not guess the origin**, configure Vercel branch-specific variables or claim exact-SHA deployment acceptance. Full OAuth redirect acceptance remains unverified until isolated runtime origin and auth boundaries are independently proven.

## Exact-SHA Vercel deployment failure: verified build events

GitHub CI #666 **passed** for `b87318e03684e7169a1cd5c06f11f35fc3c94442`. Vercel deployment `dpl_Ak9nxjjH2QY8odQ52ZnxXv5yRB2G` is **ERROR**, not READY, for that exact commit and branch `codex/rel-staging-identity-gate-20261114`. Read-only build events confirm Vercel cloned the correct SHA, installed dependencies, ran `npm run build`, then stopped at `vite.config.js` with the explicit error **"Preview build blocked: staging identity guard must be enabled"**. This is the intended fail-closed preview gate, not an unexplained compiler error or a build-rate-limit denial for this particular deployment. Do not bypass the gate.

Base44 app-status metadata independently reports `ready` for staging app `6aefe9d09e2788fc8591c758` and production app `6a504ebe6a5a6d1be058226c`; distinct IDs/statuses do not prove separate authentication, functions, secrets, database or SDK backend HTTPS origin. Read-only staging config files and installed SDK package metadata did not attest an effective backend origin. Thus the necessary Vercel branch-scoped `VITE_STAGING_PREVIEW_REQUIRED` and identity/origin variables remain **unconfigured by design**, and no authenticated synthetic requests have been made. The 10 persistent staging-only synthetic guard tests and Base44 checkpoint `6af83ae985a7f233759e74a9` remain intact. Acceptance needs authoritative backend-origin evidence and tenant boundary verification before any branch-scoped Vercel variable changes.
