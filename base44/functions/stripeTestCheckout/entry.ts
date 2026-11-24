// base44/functions/stripeTestCheckout/entry.ts
// Isolated Stripe TEST-mode checkout for safe end-to-end verification of the
// billing lifecycle (checkout → webhook → subscription provision) without
// charging a real customer. Uses STRIPE_TEST_SECRET_KEY and the test price,
// and sets metadata[mode]=test so stripeWebhook can distinguish test events
// from live ones. Live checkout (stripeCheckout) remains untouched.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { stripeEnvironment, stripeSecret } from '../../shared/stripeEnvironment.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Authentication required to start test checkout." }, { status: 401 });

    const { appId, apiKey, origin, test, webhookSecret } = stripeEnvironment();
    if (!test) return Response.json({ error: 'Test checkout is only available on private staging.' }, { status: 404 });
    const priceId = stripeSecret('STRIPE_TEST_PRO_PRICE_ID');
    if (!apiKey || !priceId || !webhookSecret) return Response.json({ error: 'Test billing is not configured.' }, { status: 503 });
    const params = new URLSearchParams();
    params.append("ui_mode", "hosted");
    params.append("mode", "subscription");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("client_reference_id", user.id);
    params.append("success_url", `${origin}/welcome?plan=pro&mode=test`);
    params.append("cancel_url", `${origin}/subscribe?status=canceled&mode=test`);
    params.append("metadata[base44_app_id]", appId);
    params.append("metadata[plan]", "pro");
    params.append("metadata[user_id]", user.id);
    params.append("metadata[mode]", "test");
    params.append("subscription_data[metadata][base44_app_id]", appId);
    params.append("subscription_data[metadata][plan]", "pro");
    params.append("subscription_data[metadata][user_id]", user.id);
    params.append("subscription_data[metadata][mode]", "test");

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Stripe-Version": "2025-10-29.clover",
        "Idempotency-Key": crypto.randomUUID(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Stripe test checkout error", data?.error?.message);
      return Response.json({ error: data?.error?.message || "Test checkout failed" }, { status: 502 });
    }
    return Response.json({ url: data.url, mode: "test" });
  } catch (e) {
    console.error("stripeTestCheckout", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
