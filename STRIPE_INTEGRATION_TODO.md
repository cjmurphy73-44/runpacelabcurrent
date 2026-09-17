# Stripe Integration — Setup & Remaining Steps

This app uses **Hosted Stripe Checkout**. The Checkout Session is created server-side in the existing `stripeCheckout` backend function, and fulfillment is handled by the existing `stripeWebhook` backend function (which provisions the `Subscription` entity).

> Status: **Scenario A** — an existing Checkout Session API call was found and updated in place. Only the parameters of that call were changed; no other code was touched.

---

## Configured Parameters

These parameters were configured in **Checkout Studio** (`fixed_by_ui`) and are now set in the checkout call.

**File containing these parameters:**
- [base44/functions/stripeCheckout/entry.ts](base44/functions/stripeCheckout/entry.ts)

| Parameter | Value |
|-----------|-------|
| ui_mode | `hosted` (API version `2025-10-29.clover` does not yet support `hosted_page`; see versioning note) |
| billing_address_collection | `auto` |
| phone_number_collection | `{ enabled: false }` |
| automatic_tax | `{ enabled: false }` |
| allow_promotion_codes | `false` |
| payment_method_collection | `always` (included because mode is `subscription`) |
| submit_type | `auto` |
| integration_identifier | `hosted_web_0001` |
| origin_context | `web` |

### ui_mode versioning note

The backend calls the Stripe REST API directly via `fetch` (no Stripe Node SDK is installed) and pins `Stripe-Version: 2025-10-29.clover`. That API version does **not** support `hosted_page` (requires `2026-03-25.dahlia`), so per the versioning rule `ui_mode` is set to **`hosted`**. When the pinned API version is bumped to `2026-03-25.dahlia` or later, change `ui_mode` back to `hosted_page`.

---

## Values to Replace

These `sample_only` values were already present in the code with **real, non-placeholder values**, so they were preserved as-is (per Scenario A precedence rules). No placeholders currently remain in the call — they are listed here for reference and for future edits.

**File containing these values:**
- [base44/functions/stripeCheckout/entry.ts](base44/functions/stripeCheckout/entry.ts)

| Field | Current Value | Notes |
|-------|---------------|-------|
| mode | `subscription` | Correct for recurring billing (Pro/Team are monthly plans). Set to `payment` only if you switch to one-time charges. |
| success_url | `${origin}/subscribe?status=success` | Redirects back to the `/subscribe` page on success. Keep `{CHECKOUT_SESSION_ID}` out — the app reads `?status=success` instead. |
| cancel_url | `${origin}/subscribe?status=canceled` | Redirects back to `/subscribe` on cancel. |
| line_items[0].price | resolved from `PRO_PRICE_ID` / `TEAM_PRICE_ID` secrets | Already real Price IDs stored as app secrets. No `price_...` placeholder. |

No `price_...` placeholder values are present — the Price IDs are sourced from the `PRO_PRICE_ID` and `TEAM_PRICE_ID` app secrets.

---

## Environment Variables / Secrets

All required secrets are already set for this app (Settings → Secrets):

| Secret | Purpose |
|--------|---------|
| `STRIPE_SECRET_KEY` | Server-side Stripe API key (used by `stripeCheckout` + `stripeWebhook`). |
| `STRIPE_PUBLISHABLE_KEY` | Frontend Stripe.js key (Vite — would be `VITE_` prefixed if read in browser; currently checkout is fully server-side so no prefix needed). |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for verifying `stripeWebhook` payloads. |
| `PRO_PRICE_ID` | Stripe Price ID for the Pro plan ($19/mo). |
| `TEAM_PRICE_ID` | Stripe Price ID for the Team plan ($49/mo). |

**Going live with real payments:** Dashboard → Integrations → Stripe → provide your own live API keys to switch out of Test Mode.

---

## Project Structure (files involved)

- `base44/functions/stripeCheckout/entry.ts` — creates the Checkout Session and returns its hosted URL. **Updated this task** (added Checkout Studio params).
- `base44/functions/stripeWebhook/entry.ts` — verifies the Stripe signature and provisions/updates the `Subscription` entity on `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`. Unchanged.
- `src/pages/Subscribe.jsx` — frontend page that invokes `stripeCheckout` and redirects to the hosted URL. Unchanged.
- `base44/entities/Subscription.jsonc` — stores the user's plan, status, and Stripe customer/subscription IDs. Unchanged.

No new files were created (Scenario A).

---

## How the integration works (flow)

1. User picks a plan on `/subscribe` → frontend calls `base44.functions.invoke("stripeCheckout", { plan, user_id })`.
2. `stripeCheckout` resolves the Price ID from secrets, builds the Checkout Session with the Checkout Studio params + the app's business params (`client_reference_id`, `metadata[base44_app_id]`, `subscription_data`), and returns `{ url }`.
3. Frontend redirects to the Stripe-hosted page (`hosted_page`).
4. On success, Stripe calls `stripeWebhook` → signature is verified → the `Subscription` entity is created/updated with `plan`, `status`, `stripe_customer_id`, `stripe_subscription_id`, and `current_period_end`.
5. User is redirected back to `/subscribe?status=success`.

---

## Testing

- App is in **Stripe Test Mode**. Use card `4242 4242 4242 4242` (any future expiry + CVC).
- Trigger a checkout from `/subscribe`, complete on Stripe, then confirm a `Subscription` record appears for your user.
- Webhook endpoint: `https://trainpacelab.base44.app/functions/stripeWebhook` — ensure it is registered in your Stripe dashboard with the events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` and that its signing secret matches `STRIPE_WEBHOOK_SECRET`.

---

## Next steps

- Confirm the webhook endpoint is registered in Stripe and receiving events.
- When ready to accept real payments, swap in live Stripe keys (Dashboard → Integrations).
- Update Price IDs or add new plans by editing the `PRO_PRICE_ID` / `TEAM_PRICE_ID` secrets.

## Resources
- https://support.stripe.com
- https://docs.stripe.com/mcp