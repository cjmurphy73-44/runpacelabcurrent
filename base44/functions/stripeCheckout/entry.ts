import { secrets } from "base44:runtime";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { reportError } from '../../shared/errorReport.ts';

const PRICE_BY_PLAN = { pro: "PRO_PRICE_ID" };

export default async function(req) {
  try {
    // Resolve the authenticated caller so subscriptions can never be attributed
    // to an arbitrary or nonexistent account. The frontend Subscribe page is
    // behind AppLayout (auth-gated), so the caller's session is expected here.
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Authentication required to start checkout." }, { status: 401 });

    const body = await req.json();
    const { plan } = body || {};
    const priceSecret = PRICE_BY_PLAN[plan];
    if (!priceSecret) return Response.json({ error: "Invalid plan" }, { status: 400 });

    const priceId = secrets.get(priceSecret);
    const apiKey = secrets.get("STRIPE_SECRET_KEY");
    if (!priceId || !apiKey) {
      console.error("stripeCheckout missing config", { hasPrice: !!priceId, hasKey: !!apiKey });
      return Response.json({ error: "Billing not configured" }, { status: 500 });
    }

    const origin = new URL(req.url).origin;
    const params = new URLSearchParams();
    // fixed_by_ui (Checkout Studio) parameters
    params.append("ui_mode", "hosted");
    params.append("billing_address_collection", "auto");
    params.append("phone_number_collection[enabled]", "false");
    params.append("automatic_tax[enabled]", "false");
    params.append("allow_promotion_codes", "false");
    params.append("payment_method_collection", "always");
    params.append("submit_type", "auto");
    params.append("integration_identifier", "hosted_web_0001");
    params.append("origin_context", "web");
    // sample_only (existing real values preserved)
    params.append("mode", "subscription");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("client_reference_id", user.id);
    params.append("success_url", `${origin}/subscribe?status=success`);
    params.append("cancel_url", `${origin}/subscribe?status=canceled`);
    const appId = Deno.env.get("BASE44_APP_ID") || "";
    params.append("metadata[base44_app_id]", appId);
    params.append("metadata[plan]", plan);
    params.append("metadata[user_id]", user.id);
    params.append("subscription_data[metadata][base44_app_id]", appId);
    params.append("subscription_data[metadata][plan]", plan);
    params.append("subscription_data[metadata][user_id]", user.id);

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
      console.error("Stripe checkout error", data?.error?.message);
      return Response.json({ error: data?.error?.message || "Checkout failed" }, { status: 502 });
    }
    return Response.json({ url: data.url });
  } catch (e) {
    console.error("stripeCheckout", e.message);
    try { await reportError(base44, { source: 'stripeCheckout', message: e.message, stack: e.stack, severity: 'High' }); } catch {}
    return Response.json({ error: e.message }, { status: 500 });
  }
}