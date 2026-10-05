import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { constantTimeEqual } from "../../shared/crypto.ts";
import { reportError } from "../../shared/errorReport.ts";

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
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const body = await req.text();
    const sigHeader = req.headers.get("stripe-signature");

    // Try both live and test webhook secrets. Stripe test events have a different
    // signing secret than live ones, and event.livemode tells us which API key to
    // use for subscription retrieval. Try live first, then test.
    const liveSecret = secrets.get("STRIPE_WEBHOOK_SECRET");
    const testSecret = secrets.get("STRIPE_TEST_WEBHOOK_SECRET");

    let verifyLive = liveSecret ? await verifySignature(body, sigHeader, liveSecret) : { ok: false };
    let verifyTest = testSecret ? await verifySignature(body, sigHeader, testSecret) : { ok: false };

    if (!verifyLive.ok && !verifyTest.ok) {
      return Response.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const isTestMode = !event.livemode || verifyTest.ok;
    const apiKey = isTestMode ? (secrets.get("STRIPE_TEST_SECRET_KEY") || secrets.get("STRIPE_SECRET_KEY")) : secrets.get("STRIPE_SECRET_KEY");

    const sr = base44.asServiceRole;
    const priceIds = { pro: secrets.get("PRO_PRICE_ID"), unlimited: secrets.get("UNLIMITED_PRICE_ID"), coach_pro: secrets.get("COACH_PRO_PRICE_ID"), team: secrets.get("TEAM_PRICE_ID") };

    // Event-id idempotency: Stripe retries events. Key on the Stripe event id so a
    // retried event is processed exactly once — independent of the subscription-level
    // dedup below.
    const eventId = `stripe:${event.id}`;
    try {
      const seen = await sr.entities.WebhookEvent.filter({ event_id: eventId });
      if (seen.length > 0) return Response.json({ received: true, duplicate: true });
    } catch (e) { /* fail open — Stripe will retry */ }

    const provision = async (userId, plan, status, customer, subId, periodEnd) => {
      // Validate the user exists before provisioning — prevents granting access to
      // a client_reference_id that doesn't resolve to a real app user.
      const userCheck = await sr.entities.User.get(userId).catch(() => null);
      if (!userCheck) throw new Error(`User not found for client_reference_id: ${userId}`);

      const existing = await sr.entities.Subscription.filter({ user_id: userId }, "-created_date", 5);
      const payload = { user_id: userId, plan, status, stripe_customer_id: customer, stripe_subscription_id: subId, current_period_end: periodEnd };
      if (existing[0]) await sr.entities.Subscription.update(existing[0].id, payload);
      else await sr.entities.Subscription.create(payload);
    };

    const logEvent = async (outcome) => {
      try { await sr.entities.WebhookEvent.create({ event_id: eventId, provider: "stripe", outcome }); } catch (e) { console.warn("WebhookEvent log failed:", e); }
    };

    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const userId = s.client_reference_id;
      if (!userId) {
        await logEvent("ack_only");
        return Response.json({ received: true, error: "No client_reference_id on session" });
      }
      const sub = await getSubscription(apiKey, s.subscription);
      const plan = sub ? planFromPrice(sub, priceIds) : null;
      // Do NOT default to "pro" — if we can't identify the price, reject so the
      // issue is visible instead of silently granting the wrong plan.
      if (!plan) {
        console.error("stripeWebhook: could not resolve plan from subscription", { subId: s.subscription, mode: isTestMode ? "test" : "live" });
        await logEvent("ack_only");
        return Response.json({ received: true, error: "Could not resolve plan from subscription price" });
      }
      const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
      await provision(userId, plan, "active", s.customer, s.subscription, periodEnd);
      await logEvent("created");
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const plan = planFromPrice(sub, priceIds);
      if (!plan) {
        // Don't default to "free" on update either — if we can't identify the price,
        // leave the existing subscription untouched and ack.
        await logEvent("ack_only");
        return Response.json({ received: true });
      }
      const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
      const existing = await sr.entities.Subscription.filter({ stripe_subscription_id: sub.id }, "-created_date", 5);
      if (existing[0]) await sr.entities.Subscription.update(existing[0].id, { plan, status, current_period_end: periodEnd, stripe_customer_id: sub.customer });
      await logEvent("created");
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const existing = await sr.entities.Subscription.filter({ stripe_subscription_id: sub.id }, "-created_date", 5);
      if (existing[0]) await sr.entities.Subscription.update(existing[0].id, { plan: "free", status: "canceled" });
      await logEvent("created");
    } else {
      await logEvent("ack_only");
    }

    return Response.json({ received: true });
  } catch (e) {
    console.error("stripeWebhook", e.message);
    try { if (base44) await reportError(base44, { source: "stripeWebhook", message: e.message, stack: e.stack, severity: "High" }); } catch {}
    return Response.json({ error: e.message }, { status: 500 });
  }
}