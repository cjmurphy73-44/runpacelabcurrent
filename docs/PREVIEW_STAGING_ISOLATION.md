# Vercel Preview / Base44 staging isolation

**Status (2026-11-11):** Vercel Preview deployment and exact staging identity allowlist verified; GitHub CI passed 201 tests in 28 files. Direct `/login` and `/staging-check` URLs return HTTP 200. **Owner-reported browser result: HTTP 403, “Reachable — authentication required,”** from the Preview-only unauthenticated staging API/CORS check. This passes the unauthenticated browser connectivity gate, **not** OAuth, MFA, authenticated access, backend integration isolation or synthetic athlete read/write acceptance.

## Why this exists

The published TrainPaceLab frontend has a hard-coded Base44 app ID fallback for its existing OAuth flow. That fallback is **not safe for a Vercel Preview**: if a Preview build lacks staging variables, it could connect to production. The preview guard prevents mounting the React app unless both the app ID and HTTPS root match the exact owner-confirmed Base44 staging project. Rejecting only the published app ID is insufficient: an unrelated ID or a production backend URL must also fail closed.

## Verified Base44 project identities

| Environment | App ID | API base URL | Frontend domain |
| --- | --- | --- | --- |
| Production (`TrainPaceLab`) | `6a504ebe6a5a6d1be058226c` | `https://trainpacelab.base44.app/api` | `https://trainpacelab.com` (owner-reported custom domain) |
| Staging (`TrainPaceLab-Staging`) | `6aefe9d09e2788fc8591c758` | `https://train-pace-lab-copy-8591c758.base44.app/api` | `https://train-pace-lab-copy-8591c758.base44.app` |

The API references show distinct project IDs. They do **not** by themselves verify separate webhook targets, secrets, integration credentials, data stores or OAuth callbacks. `VITE_APP_BASE_URL` is the **application root**, not the API reference's `/api` endpoint; the installed Base44 SDK uses `appBaseUrl` for login redirects and `serverUrl` as the `/api` origin. Preview now supplies the staging root for both; production retains its existing `serverUrl: ''` behavior.

## Required setup (owner)

1. Use the staging project identity confirmed by the owner-provided Base44 API reference. Confirm that the staging SDK works with the application root URL before enabling authentication.
2. In **Vercel → runpacelabcurrent → Settings → Environment Variables**, configure **Preview only**. These two public identifiers are pinned in the code and must match exactly; changing the staging backend requires a reviewed code change as well as an environment update:
   - `VITE_APP_ID=6aefe9d09e2788fc8591c758`
   - `VITE_APP_BASE_URL=https://train-pace-lab-copy-8591c758.base44.app`
   - Do not place keys, access tokens or secrets in any `VITE_*` variable.
3. Redeploy the Preview build after setting the variables; Vite embeds them **at build time**. Vercel's `VERCEL_ENV=preview` is embedded by `vite.config.js` as a non-secret deployment label. Branch preview hostnames containing `-git-` also trigger the guard.
4. Confirm that the Preview SDK API requests go to `https://train-pace-lab-copy-8591c758.base44.app/api`, not `/api` on Vercel; check CORS and unauthenticated response behavior. Confirm the Base44 staging OAuth redirect/callback is permitted for the actual Preview hostname. Verify staging integrations and backend function credentials are independent of production. Do not sign in before this is verified.
5. Use a clean browser profile and **synthetic** staging athlete. Verify an authorized staging-only write, a harmless staging function call, and absence of that record in an authorized production read-only view. Do not import production data or use production tokens.
6. Record 390px and 320px authenticated screenshots and navigation checks before accepting the dashboard PR.

## Browser acceptance gate (read-only)

1. Confirm the latest branch deployment is READY and direct routes such as `/login` and `/staging-check` return HTML (not Vercel 404). `vercel.json` contains the Vite SPA fallback rewrite; verify static JS/CSS assets still load.
2. On the latest Preview URL, open `/staging-check` in a clean browser profile. This screen is gated by the Preview build flag and does **not** mount authentication or athlete data providers.
3. Click **Check staging API and CORS**. The test makes a single unauthenticated, read-only `GET` to the configured staging `/api/apps/<staging-id>/entities/User/me` with `X-App-Id`, `credentials: omit`, and no token. A browser-visible 401 or 403 indicates API reachability and CORS for that request. A 200 is a warning (verify endpoint permissions); 404/5xx or fetch rejection blocks progression. A failed fetch may be due to CORS or network access; check DevTools without pasting credentials or tokens.
4. **Do not sign in until the above succeeds and staging OAuth callback/redirect allowlisting is confirmed.** A passing browser probe is not evidence of authenticated access or backend data isolation.
5. After separate authorization and integration checks, use a synthetic staging athlete for a controlled write and verify its absence using an authorized, read-only production view. Keep real athlete data and credentials out of staging.

## Authentication and MFA review (not yet accepted)

The 403 result confirms a single read-only unauthenticated request reached the configured staging API through browser CORS. Do not interpret it as successful login or evidence of separate storage or credentials.

- **Base44 staging configuration — owner verification required:** confirm the staging project's authentication methods, permitted frontend/return URLs and OAuth callback/redirect configuration for the actual Vercel Preview hostname. Check Google/Apple separately if enabled; do not paste client secrets, access tokens, or live athlete credentials.
- **SDK sign-in:** `src/pages/Login.jsx` and `src/pages/Register.jsx` call the Base44 SDK's email/password and social sign-in methods. Their provider redirect behavior still requires an end-to-end staging-only test.
- **MFA compatibility issue identified by code inspection:** `src/lib/authMfa.js` and `src/lib/authMfaFlow.js` use relative `/api/apps/...` fetches and Vercel-origin `/auth/mfa` redirects. Vercel is a static SPA host, not a Base44 auth server; these paths are **not yet verified to work in Preview**. Do not enable or test MFA on Preview until routes and handoff behavior are reviewed and corrected in a separate, tested task.
- **Backend isolation — owner verification required:** independently check staging function secrets, webhook endpoints, OAuth integrations, billing/Stripe modes, and entity data stores before authenticated synthetic athlete testing.
- **Next safe check:** confirm the Base44 staging project's auth redirect settings in its dashboard, using only public URL/hostname information. Do not attempt login or synthetic writes until these are checked.

## Fail-closed behaviour

When Preview variables are missing, invalid or differ from the exact approved staging app ID and HTTPS root, the frontend displays **Preview configuration required** and does not mount auth/data providers. Even a valid staging app ID paired with a production or unrelated HTTPS origin is rejected. SDK credentials are cleared on invalid Preview configuration. URL `app_id`/`app_base_url` and browser local storage cannot override Preview build-time identifiers. Stored tokens are not reused in Preview.

The production path is deliberately unchanged. This is a **frontend safety guard, not proof of full backend isolation**: Base44 project settings, OAuth redirects, server functions, integration credentials and all write targets must still be audited.

Do not merge or deploy to production until CI, staging checks and independent review pass.
