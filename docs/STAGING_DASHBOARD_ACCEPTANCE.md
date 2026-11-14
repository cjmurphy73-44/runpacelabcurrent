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

**Limitations:** A deployment with the opt-in flag absent does not enforce this guard. The Base44 Vite plugin may use separate `VITE_BASE44_APP_ID` and `VITE_BASE44_APP_BASE_URL`; verify those independently. An HTTPS origin being different is not proof of tenancy isolation. Never promote or run authenticated QA without verifying effective deployment values and staging tenant ownership.
