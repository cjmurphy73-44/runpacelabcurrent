// base44/functions/stripeBillingPortal/entry.ts
// Creates a Stripe Customer Portal session so a paying user can view invoices,
// update payment methods, or cancel their subscription without leaving the app.
// Resolves the customer id from the caller's Subscription record (provisioned by
// stripeWebhook) — never trusts a client-supplied customer id.

import { secrets } from "base44:runtime";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { reportError } from '../../shared/errorReport.ts';

export default async function(req) {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

    const apiKey = secrets.get("STRIPE_SECRET_KEY");
    if (!apiKey) return Response.json({ error: "Billing not configured." }, { status: 500 });

    // Resolve the caller's stored subscription to find their Stripe customer id.
    const subs = await base44.entities.Subscription.filter({ user_id: user.id }, "-created_date", 5);
    const sub = subs[0];
    const customerId = sub?.stripe_customer_id;
    if (!customerId) {
      return Response.json({ error: "No active billing account found. If you just subscribed, refresh in a moment." }, { status: 404 });
    }

    const origin = new URL(req.url).origin;
    const params = new URLSearchParams();
    params.append("customer", customerId);
    params.append("return_url", `${origin}/subscribe`);

    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
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
      console.error("Stripe portal error", data?.error?.message);
      return Response.json({ error: data?.error?.message || "Could not open billing portal." }, { status: 502 });
    }
    return Response.json({ url: data.url });
  } catch (e) {
    console.error("stripeBillingPortal", e.message);
    try { if (base44) await reportError(base44, { source: 'stripeBillingPortal', message: e.message, stack: e.stack, severity: 'Medium' }); } catch {}
    return Response.json({ error: e.message }, { status: 500 });
  }
}