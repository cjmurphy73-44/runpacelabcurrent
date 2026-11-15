# TPL-002 — Staging backend/external dependency inventory

**Inspection:** 2026-11-12; read-only Base44 connector session.  
**Environment:** `TrainPaceLab-Staging`, app ID `6aefe9d09e2788fc8591c758`. **Production was not modified.**  
**Evidence scope:** Base44 staging **sandbox source** and app secret **name list**; not live execution or function deployment confirmation. No functions invoked, user records queried, external calls made, or secret values retrieved.

## Environment observations

- Base44 staging code sandbox contains **50** `base44/functions/` directories (including one `common` directory). Directory presence does **not** prove that a function is deployed or callable. The deployed-functions API previously returned `truncated:true`; activation is **unknown**.
- App secret-name API returned only **`TPL_ENVIRONMENT`** and **`WEBHOOK_SYNC_SECRET`**. This is a name inventory, not a runtime proof of absence across every secret resolution mechanism. **Never publish values.**
- Base44 connector catalog reports **Airtable disconnected** and **GitHub API disconnected**. This does not exclude custom outbound HTTP or provider-managed integrations.
- `TPL_ENVIRONMENT=staging` is owner-confirmed, but the audited Stripe/COROS/Garmin functions do not enforce it as a fail-closed guard. Treat any staging connection to a real provider as potentially unsafe until independently proven isolated.

## Function-to-service matrix

| Function / helper | External destination or side effect | Source-level config / identity | Source-level isolation observations | Staging readiness |
| --- | --- | --- | --- | --- |
| `stripeCheckout` | Stripe `/v1/checkout/sessions`; subscription checkout | `STRIPE_SECRET_KEY`; `PRO_PRICE_ID`/`UNLIMITED_PRICE_ID`/`COACH_PRO_PRICE_ID`; authenticated user; `BASE44_APP_ID` | Uses generic Stripe key, **no staging/test-mode assertion**. Checkout return URLs derive from `X-Base44-App-Url` header; origin allowlist not evident in inspected source | **Blocked** pending explicit test-only guard and origin validation |
| `stripeTestCheckout` | Stripe test checkout | `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_PRO_PRICE_ID`; authenticated user | Dedicated test-mode path; still requires runtime verification | Config unverified; no live invocation |
| `stripeWebhook` | Stripe subscription lookup and service-role subscription writes | `STRIPE_WEBHOOK_SECRET`, `STRIPE_TEST_WEBHOOK_SECRET`, `STRIPE_TEST_SECRET_KEY`, `STRIPE_SECRET_KEY`, plan price IDs | Validates Stripe signatures and tracks event IDs, but accepts live/test signing paths; **test-mode key selection falls back to live `STRIPE_SECRET_KEY`**. No staging-specific deny-live gate observed | **Blocked** pending fail-closed separation and signature/entitlement tests |
| `stripeBillingPortal` | Stripe billing portal sessions | `STRIPE_SECRET_KEY`, authenticated user, `X-Base44-App-Url` | Generic key, no staging/test-mode assertion; return URL comes from request header | **Blocked** pending test-only guard |
| `corosSync` / `shared/oauth.ts` | COROS MCP OAuth/token/sync, athlete connection writes | `COROS_MCP_CLIENT_ID`, `COROS_REDIRECT_URI`, `COROS_WEBHOOK_SECRET`; HMAC state and user/session depending on action | **Fallback callback points to production** `https://trainpacelab.base44.app/functions/corosSync`; fallback settings origin also production. Staging must never rely on that fallback | **Blocked** until staging-only callback and separate provider identity verified |
| `garminSync` / `shared/garminAuth.ts` | Garmin OAuth, API pull, connection and workout writes | `GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET`, `GARMIN_API_BASE`, `GARMIN_REDIRECT_URI`, optional endpoint overrides | **Fallback redirect points to production** `https://trainpacelab.base44.app/functions/garminSync` | **Blocked** until staging-only redirect and test provider |
| `garminWebhook` | Garmin push ingest, FIT download, service-role workout/recovery writes | `GARMIN_WEBHOOK_SECRET`; signature header; mapped Garmin user | Missing secret returns 503; signed webhook can fetch FIT URL and create records. URL provenance/SSRF restrictions require separate security test | **Blocked** until deployed-status and signature/URL controls proven |
| `stravaSync` | Strava OAuth, activities, deauthorize, workout writes | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`; authenticated authorize/status/sync actions | Uses function-derived callback and service-role connection writes; test account and callback not verified | Not accepted |
| `workoutWebhook` | Per-athlete workout ingest, optional FIT URL fetch, Strava webhook | Per-athlete `webhook_api_key`; `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_VERIFY_TOKEN`; Strava signature path | Service-role writes; per-athlete API key can appear in webhook URL. Validate secret handling, URL fetch restrictions, signature fallback, idempotency and athlete ownership | Not accepted |
| `webhookWearableSync` | Signed incoming wearable POST | `WEBHOOK_SYNC_SECRET`; constant-time header comparison | Rejects unset/mismatched secret; **only acknowledges receipt**, no workout ingestion | **Not an operational ingest** |
| `wearableOAuthSync` | Oura, WHOOP, Withings, Polar, Fitbit, Suunto OAuth and recovery APIs | Provider-specific `*_CLIENT_ID`/`*_CLIENT_SECRET` names in source | Generic multi-provider OAuth with service-role connection writes; source comments say endpoints are best-effort; provider approval and staging isolation unverified | **Do not advertise as connected** |
| `airtableSync` / `shared/airtableClient.ts` | Airtable REST mirror: athletes, workouts, plans, subscribers, coach roster and metrics | Base44 Airtable OAuth connector token via `asServiceRole.connectors.getConnection('airtable')`; admin role check | Connector disconnected. Code could export sensitive athlete and subscriber data when connected and invoked. No staging export authorized | **Blocked**; do not connect or run against real Airtable base |
| `logErrorToAirtable` / `shared/errorReport.ts` | Airtable error reports | Same Airtable connector | Error-report delivery unavailable with disconnected connector; do not log private tokens | Not active via connector |
| `bulkIngestWorkouts` | Uploaded workout parse, optional remote file fetch, workout writes | Authenticated user, service-role entities | Requires separate owner, file URL and SSRF tests before synthetic write exercise | Not accepted |

### High-priority, source-grounded risks

1. **P0: staging-to-production OAuth redirect leakage.** Both `corosSync` and `shared/garminAuth.ts` contain production fallback callback URLs. If staging functions are enabled without explicit staging redirects, consent can return to production. **Do not run staging OAuth flows** until callback allowlists and registered provider apps are verified.
2. **P0: Stripe live/test mixing.** The generic checkout and portal use `STRIPE_SECRET_KEY`, and the webhook can select live signing/keys; test webhook lookup falls back to live API key. **Do not run staging billing**. Introduce a fail-closed staging guard and test-only configuration in an isolated reviewed code task before any synthetic purchase.
3. **P0: Airtable privacy/export boundary.** `airtableSync` can mirror athlete/workout/subscription data with service role. Connector currently disconnected; leave it disconnected until explicit environment-specific destination, privacy controls and retention acceptance.
4. **P1: webhook/FIT URL and identity boundaries.** Garmin/Strava/generic webhook handlers accept external inputs and perform service-role writes; inspect signature verification, URL allowlists, athlete ownership and idempotency before enabling. The simple `webhookWearableSync` receiver is an ACK-only endpoint.
5. **P1: provider availability claims.** Presence of 50 sandbox function directories does not establish deployment, credentials, partner approval, or a working wearable connection. UI should say “not connected” or “not available” until verified.

### Acceptance and next actions

- [x] Enumerated staging sandbox function directories and inspected relevant function/helper source.
- [x] Mapped key external services, config names, service-role writes and environment boundary risks.
- [x] Verified app secret-name list and connector statuses without retrieving secret values.
- [x] Distinguished sandbox source from deployed/runtime availability; **no live endpoints invoked**.
- [x] No production writes, staging writes, secrets changes, external OAuth/Stripe/Airtable calls or Odysseus changes.
- [ ] Confirm deployed function inventory through a non-truncated platform response and compare to repository source.
- [ ] Design and test fail-closed staging redirect and Stripe mode guards as **separate atomic code PRs**.
- [ ] Audit entity RLS and service-role bypasses (TPL-003); then synthetic auth/athlete isolation.
- [ ] Verify provider and billing configuration with sanitized presence-only evidence, never real secret values.

**Gate:** G1/G3 remain **not accepted**. This audit is an inventory, not proof that staging is safe to use for payments, OAuth or athlete writes.
