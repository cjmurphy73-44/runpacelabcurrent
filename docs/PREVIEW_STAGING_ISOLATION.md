# Vercel Preview / Base44 staging isolation

**Status:** Not verified until the staging dashboard identifiers, Preview build configuration, OAuth callback and a synthetic read/write isolation test are confirmed.

## Why this exists

The published TrainPaceLab frontend has a hard-coded Base44 app ID fallback for its existing OAuth flow. That fallback is **not safe for a Vercel Preview**: if a Preview build lacks staging variables, it could connect to production. The preview guard prevents mounting the React app when this configuration is missing or points at the published app.

## Required setup (owner)

1. Open the **TrainPaceLab-Staging** project in Base44. Copy its non-secret app ID from the editor URL segment between `/apps/` and `/editor/`. Independently verify the staging app base URL. Do not infer it from the production source code.
2. In **Vercel → runpacelabcurrent → Settings → Environment Variables**, configure **Preview only**:
   - `VITE_APP_ID`: verified staging Base44 app ID (must differ from the published app ID).
   - `VITE_APP_BASE_URL`: verified HTTPS staging app base URL.
   - Do not place keys, access tokens or secrets in any `VITE_*` variable.
3. Redeploy the Preview build after setting the variables; Vite embeds them **at build time**. Vercel's `VERCEL_ENV=preview` is embedded by `vite.config.js` as a non-secret deployment label. Branch preview hostnames containing `-git-` also trigger the guard.
4. Confirm the Base44 staging OAuth redirect/callback is permitted for the actual Preview hostname. Do not sign in before this is verified.
5. Use a clean browser profile and **synthetic** staging athlete. Verify an authorized staging-only write, a harmless staging function call, and absence of that record in an authorized production read-only view. Do not import production data or use production tokens.
6. Record 390px and 320px authenticated screenshots and navigation checks before accepting the dashboard PR.

## Fail-closed behaviour

When Preview variables are missing, invalid or use the published Base44 app ID, the frontend displays **Preview configuration required** and does not mount auth/data providers. URL `app_id`/`app_base_url` and browser local storage cannot override Preview build-time identifiers. Stored tokens are not reused in Preview.

The production path is deliberately unchanged. This is a **frontend safety guard, not proof of full backend isolation**: Base44 project settings, OAuth redirects, server functions, integration credentials and all write targets must still be audited.

Do not merge or deploy to production until CI, staging checks and independent review pass.
