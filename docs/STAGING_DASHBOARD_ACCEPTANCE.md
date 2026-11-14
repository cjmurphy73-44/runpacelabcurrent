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
