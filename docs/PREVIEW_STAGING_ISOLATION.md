# Vercel Preview / Base44 staging isolation

**Status (2026-11-11):** Vercel Preview build and the frontend's exact staging identity allowlist were checked; GitHub CI passed 201 tests in 28 files at commit `52f84e4`, and direct `/login` and `/staging-check` URLs returned HTTP 200. **User-pasted browser diagnostic:** HTTP 403, “Reachable — authentication required,” for the configured staging app. This is **reported evidence**, not an independently reproduced browser CORS test or a completed end-to-end acceptance gate. Staging authentication settings, provider callbacks/redirects, sessions, MFA, backend integrations, data isolation and synthetic athlete read/write tests remain **unverified**.

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
4. Confirm that Preview SDK API requests go to `https://train-pace-lab-copy-8591c758.base44.app/api`, not `/api` on Vercel; check CORS and unauthenticated response behavior. Inspect **TrainPaceLab-Staging → Dashboard → Settings → Authentication** for its actual enabled sign-in methods and documented redirect behavior. The available information does **not** establish whether a Preview-hostname allowlist exists or is required in Base44. Where relevant, OAuth callback/redirect URIs may also require verification at the identity provider. Verify staging integrations and backend function credentials are independent of production. Do not sign in before these checks.
5. Use a clean browser profile and **synthetic** staging athlete. Verify an authorized staging-only write, a harmless staging function call, and absence of that record in an authorized production read-only view. Do not import production data or use production tokens.
6. Record 390px and 320px authenticated screenshots and navigation checks before accepting the dashboard PR.

## Browser acceptance gate (read-only)

1. Confirm the latest branch deployment is READY and direct routes such as `/login` and `/staging-check` return HTML (not Vercel 404). `vercel.json` contains the Vite SPA fallback rewrite; verify static JS/CSS assets still load.
2. On the latest Preview URL, open `/staging-check` in a clean browser profile. This screen is gated by the Preview build flag and does **not** mount authentication or athlete data providers.
3. Click **Check staging API and CORS**. The test makes a single unauthenticated, read-only `GET` to the configured staging `/api/apps/<staging-id>/entities/User/me` with `X-App-Id`, `credentials: omit`, and no token. A browser-visible 401 or 403 is consistent with API reachability and CORS for that specific request; retain browser evidence for independent review. A 200 is a warning (verify endpoint permissions); 404/5xx or fetch rejection blocks progression. A failed fetch may be due to CORS or network access; check DevTools without pasting credentials or tokens.
4. **Do not sign in until the above succeeds and staging OAuth callback/redirect allowlisting is confirmed.** A passing browser probe is not evidence of authenticated access or backend data isolation.
5. After separate authorization and integration checks, use a synthetic staging athlete for a controlled write and verify its absence using an authorized, read-only production view. Keep real athlete data and credentials out of staging.

## Authentication and MFA review (not yet accepted)

The user-pasted diagnostic reports a 403 from a single read-only unauthenticated staging request. Its browser execution has **not been independently reproduced** here. Even if reproduced, it would not establish successful login or separate storage or credentials.

- **Current/live app settings only (user-reported):** email/password, Google, Microsoft, Facebook and Apple sign-in are enabled; MFA is off. These are **not confirmed TrainPaceLab-Staging settings**. Do not transfer these conclusions to staging.

- **TrainPaceLab-Staging authentication-settings screen (project identity confirmed by owner):** email/password authentication is **enabled (owner-confirmed)**. The screen also lists Google, Microsoft, Facebook, Apple, SSO (upgrade plan) and MFA (“Require MFA”); Google displays “Here's how to set it up” and “Update”. **MFA is OFF in staging (owner-confirmed).** Other provider toggle states and configuration remain unverified. No Preview-domain allowlist or provider redirect URI is visible in this excerpt; absence from the excerpt is not proof none exists. Email/password being enabled is not proof of a working Vercel Preview login, SDK session restoration, or backend data isolation.

- **Base44 staging configuration — owner verification required:** inspect **Dashboard → Settings → Authentication** in **TrainPaceLab-Staging**, record its enabled methods and MFA policy, and determine whether any documented Base44 allowed-return-URL control applies. Do **not** assume a Preview hostname must be added to a Base44 allowlist. For each enabled OAuth provider, separately check provider-managed redirect URI requirements where applicable; do not paste client secrets, access tokens or live athlete credentials.
- **SDK sign-in:** `src/pages/Login.jsx` and `src/pages/Register.jsx` call the Base44 SDK's email/password and social sign-in methods. Their provider redirect behavior still requires an end-to-end staging-only test.
- **Session rehydration hypothesis (unverified):** `src/lib/AuthContext.jsx` skips `authService.getMe()` when `appParams.token` is absent. Whether the SDK restores its token before this check, and whether this causes any actual login problem, are **not established**. Review SDK behavior and test only with a synthetic staging account; do not label this a production defect.
- **MFA compatibility hypothesis (unverified; staging MFA confirmed OFF):** `src/lib/authMfa.js` and `src/lib/authMfaFlow.js` use relative `/api/apps/...` fetches and Vercel-origin `/auth/mfa` redirects. Vercel is a static SPA host, not a Base44 auth server; these paths are **not yet verified to work in Preview**. The current `src/App.jsx` does not register a `/mfa` route, so these appear to be legacy/unwired flows rather than the current login page. If MFA is required, routing and handoff need a separate reviewed task before use.
- **Staging Application Secrets inventory (owner screenshot, 2026-11-11):** `TPL_ENVIRONMENT` and `WEBHOOK_SYNC_SECRET` are configured. The screenshot shows a partial preview of the webhook secret; **do not reproduce or share any secret characters**. Neither the actual environment value nor whether the webhook secret differs from production is established. A repository search on the default branch found `WEBHOOK_SYNC_SECRET` in `base44/functions/webhookWearableSync/entry.ts`: this function requires a matching `x-webhook-signature` or `garmin-signature` header and otherwise returns 401. The handler currently acknowledges a valid POST but its comment says full ingestion is not wired. `TPL_ENVIRONMENT` had no default-branch code-search match; this does **not** prove it is unused in deployed functions. Secret inventory alone does not prove separate backend storage, webhook senders, or integration credentials. Do not modify secrets before mapping callers and rotation impact; the screenshot's partial secret exposure should be treated as a reason to plan rotation if this is an active credential.

- **Backend isolation — owner verification required:** independently check staging function secrets, webhook endpoints, OAuth integrations, billing/Stripe modes, and entity data stores before authenticated synthetic athlete testing.
- **Next safe check:** staging project identity, email/password enabled state, MFA OFF and secret **names** are owner-confirmed. Owner should check `TPL_ENVIRONMENT` locally (report only whether its value is `staging`, not the value itself if it contains other data), and confirm `WEBHOOK_SYNC_SECRET` is distinct from production without disclosing either value. Inspect whether any external sender targets the staging webhook and whether staging integrations or functions reference live services. Do not change secrets or run synthetic login/writes until risks are reviewed. Provider-managed OAuth redirects can be assessed separately before OAuth testing.

## Fail-closed behaviour

When Preview variables are missing, invalid or differ from the exact approved staging app ID and HTTPS root, the frontend displays **Preview configuration required** and does not mount auth/data providers. Even a valid staging app ID paired with a production or unrelated HTTPS origin is rejected. SDK credentials are cleared on invalid Preview configuration. URL `app_id`/`app_base_url` and browser local storage cannot override Preview build-time identifiers. Stored tokens are not reused in Preview.

The production path is deliberately unchanged. This is a **frontend safety guard, not proof of full backend isolation**: Base44 project settings, OAuth redirects, server functions, integration credentials and all write targets must still be audited.

Do not merge or deploy to production until CI, staging checks and independent review pass.
