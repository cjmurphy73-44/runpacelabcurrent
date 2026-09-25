import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { constantTimeEqual } from "../../shared/crypto.ts";

async function verifySignature(body, sigHeader, secret) {
  if (!sigHeader || !secret) return { ok: false };
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const [k, ...rest] = p.split("=");
      return [k, rest.join("=")];
    })
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return { ok: false };
  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(t, 10)) > 300) return { ok: false };
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${body}`));
  const computed = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { ok: constantTimeEqual(computed, v1) };
}

function planFromPrice(sub, priceIds) {
  const priceId = sub?.items?.data?.[0]?.price?.id;
  if (priceId === priceIds.pro) return "pro";
  if (priceId === priceIds.unlimited) return "unlimited";
  if (priceId === priceIds.coach_pro) return "coach_pro";
  if (priceId === priceIds.team) return "coach_pro"; // legacy Team → Coach Pro
  return null;
}

async function getSubscription(apiKey, subId) {
  const r = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, "Stripe-Version": "2025-10-29.clover" },
  });
  return r.ok ? r.json() : null;
}

export default async function(req) {
  try {
    const apiKey = secrets.get("STRIPE_SECRET_KEY");
    const whSecret = secrets.get("STRIPE_WEBHOOK_SECRET");
    const sig = req.headers.get("stripe-signature");
    const body = await req.text();
    const verify = await verifySignature(body, sig, whSecret);
    if (!verify.ok) return Response.json({ error: "Invalid signature" }, { status: 400 });

    const event = JSON.parse(body);
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const priceIds = { pro: secrets.get("PRO_PRICE_ID"), unlimited: secrets.get("UNLIMITED_PRICE_ID"), coach_pro: secrets.get("COACH_PRO_PRICE_ID"), team: secrets.get("TEAM_PRICE_ID") };

    const provision = async (userId, plan, status, customer, subId, periodEnd) => {
      const existing = await sr.entities.Subscription.filter({ user_id: userId }, "-created_date", 5);
      const payload = { user_id: userId, plan, status, stripe_customer_id: customer, stripe_subscription_id: subId, current_period_end: periodEnd };
      if (existing[0]) await sr.entities.Subscription.update(existing[0].id, payload);
      else await sr.entities.Subscription.create(payload);
    };

    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const userId = s.client_reference_id;
      const plan = s.metadata?.plan || (() => null)(); // resolved below from the subscription's price
      const sub = await getSubscription(apiKey, s.subscription);
      const resolvedPlan = plan || (sub ? planFromPrice(sub, priceIds) : "pro") || "pro";
      const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
      await provision(userId, resolvedPlan, "active", s.customer, s.subscription, periodEnd);
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const plan = planFromPrice(sub, priceIds) || "free";
      const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
      const existing = await sr.entities.Subscription.filter({ stripe_subscription_id: sub.id }, "-created_date", 5);
      if (existing[0]) await sr.entities.Subscription.update(existing[0].id, { plan, status, current_period_end: periodEnd, stripe_customer_id: sub.customer });
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const existing = await sr.entities.Subscription.filter({ stripe_subscription_id: sub.id }, "-created_date", 5);
      if (existing[0]) await sr.entities.Subscription.update(existing[0].id, { plan: "free", status: "canceled" });
    }

    return Response.json({ received: true });
  } catch (e) {
    console.error("stripeWebhook", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}