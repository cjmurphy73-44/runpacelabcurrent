# Vercel Preview / Base44 staging isolation

**Status:** Production and staging project identities confirmed by owner-provided Base44 API references on 2026-11-11. Vercel Preview configuration, SDK base URL behavior, OAuth callback and a synthetic read/write isolation test remain unverified.

## Why this exists

The published TrainPaceLab frontend has a hard-coded Base44 app ID fallback for its existing OAuth flow. That fallback is **not safe for a Vercel Preview**: if a Preview build lacks staging variables, it could connect to production. The preview guard prevents mounting the React app when this configuration is missing or points at the published app.

## Verified Base44 project identities

| Environment | App ID | API base URL | Frontend domain |
| --- | --- | --- | --- |
| Production (`TrainPaceLab`) | `6a504ebe6a5a6d1be058226c` | `https://trainpacelab.base44.app/api` | `https://trainpacelab.com` (owner-reported custom domain) |
| Staging (`TrainPaceLab-Staging`) | `6aefe9d09e2788fc8591c758` | `https://train-pace-lab-copy-8591c758.base44.app/api` | `https://train-pace-lab-copy-8591c758.base44.app` |

The API references show distinct project IDs. They do **not** by themselves verify separate webhook targets, secrets, integration credentials, data stores or OAuth callbacks. `VITE_APP_BASE_URL` is the **application root**, not the API reference's `/api` endpoint; confirm the Base44 SDK expects this root before enabling authentication.

## Required setup (owner)

1. Use the staging project identity confirmed by the owner-provided Base44 API reference. Confirm that the staging SDK works with the application root URL before enabling authentication.
2. In **Vercel → runpacelabcurrent → Settings → Environment Variables**, configure **Preview only**:
   - `VITE_APP_ID=6aefe9d09e2788fc8591c758`
   - `VITE_APP_BASE_URL=https://train-pace-lab-copy-8591c758.base44.app` (pending SDK root URL validation)
   - Do not place keys, access tokens or secrets in any `VITE_*` variable.
3. Redeploy the Preview build after setting the variables; Vite embeds them **at build time**. Vercel's `VERCEL_ENV=preview` is embedded by `vite.config.js` as a non-secret deployment label. Branch preview hostnames containing `-git-` also trigger the guard.
4. Confirm the Base44 staging OAuth redirect/callback is permitted for the actual Preview hostname. Verify staging integrations and backend function credentials are independent of production. Do not sign in before this is verified.
5. Use a clean browser profile and **synthetic** staging athlete. Verify an authorized staging-only write, a harmless staging function call, and absence of that record in an authorized production read-only view. Do not import production data or use production tokens.
6. Record 390px and 320px authenticated screenshots and navigation checks before accepting the dashboard PR.

## Fail-closed behaviour

When Preview variables are missing, invalid or use the published Base44 app ID, the frontend displays **Preview configuration required** and does not mount auth/data providers. URL `app_id`/`app_base_url` and browser local storage cannot override Preview build-time identifiers. Stored tokens are not reused in Preview.

The production path is deliberately unchanged. This is a **frontend safety guard, not proof of full backend isolation**: Base44 project settings, OAuth redirects, server functions, integration credentials and all write targets must still be audited.

Do not merge or deploy to production until CI, staging checks and independent review pass.
