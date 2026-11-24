import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { constantTimeEqual } from "../../shared/crypto.ts";
import { reportError } from "../../shared/errorReport.ts";
import { stripeEnvironment, stripeSecret } from "../../shared/stripeEnvironment.ts";

async function verifySignature(body, sigHeader, secret) {
  if (!sigHeader || !secret) return { ok: false };
  const parts = new URLSearchParams(sigHeader.replaceAll(",", "&"));
  const t = parts.get("t");
  const signatures = parts.getAll("v1");
  if (!t || !/^\d+$/.test(t) || !signatures.length) return { ok: false };
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(t)) > 300) return { ok: false };
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${body}`));
  const computed = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { ok: signatures.some(signature => constantTimeEqual(computed, signature)) };
}

function planFromPrice(sub, priceIds) {
  const priceId = sub?.items?.data?.[0]?.price?.id;
  if (!priceId) return null;
  if (priceId === priceIds.pro) return "pro";
  if (priceId === priceIds.unlimited) return "unlimited";
  if (priceId === priceIds.coach_pro) return "coach_pro";
  if (priceId === priceIds.team) return "coach_pro"; // legacy Team → Coach Pro
  return null;
}

// Newer Stripe API versions (incl. 2025-10-29.clover) moved current_period_end from
// the subscription onto its items; older payloads still carry it at the top level.
function periodEndIso(sub) {
  const ts = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

async function getSubscription(apiKey, subId) {
  if (typeof subId !== 'string' || !/^sub_[a-zA-Z0-9]+$/.test(subId)) return null;
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

    const { appId, test, apiKey, webhookSecret } = stripeEnvironment();
    if (!(await verifySignature(body, sigHeader, webhookSecret)).ok) {
      return Response.json({ error: "Invalid signature" }, { status: 400 });
    }
    const event = JSON.parse(body);
    if (event.livemode !== !test) return Response.json({ error: 'Stripe mode mismatch' }, { status: 400 });
    if (!apiKey) return Response.json({ error: 'Billing is not configured' }, { status: 503 });

    const sr = base44.asServiceRole;
    // Only Pro is sold today. Unlimited / Coach Pro / legacy Team prices are optional and
    // must never break the webhook when their secrets aren't defined.
    const priceIds = test ? { pro: stripeSecret('STRIPE_TEST_PRO_PRICE_ID') } : {
      pro: stripeSecret('PRO_PRICE_ID'), unlimited: stripeSecret('UNLIMITED_PRICE_ID'),
      coach_pro: stripeSecret('COACH_PRO_PRICE_ID'), team: stripeSecret('TEAM_PRICE_ID'),
    };

    // Event-id idempotency: Stripe retries events. Key on the Stripe event id so a
    // retried event is processed exactly once — independent of the subscription-level
    // dedup below.
    const eventId = test ? `stripe:test:${event.id}` : `stripe:${event.id}`;
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

    // Paid access is granted by Stripe Checkout only, and only once payment is actually
    // confirmed. checkout.session.completed can arrive while a delayed payment method is
    // still pending, so both that event and the later async success run through this
    // branch — the payment_status check below is what makes it safe.
    const isCheckoutEvent = event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded";

    if (isCheckoutEvent && event.data?.object?.metadata?.base44_test_checkout === "true") {
      // Base44 merchant self-test charge, not a customer order.
      return Response.json({ received: true, ignored: "base44_test_checkout" });
    }

    if (isCheckoutEvent) {
      const s = event.data.object;
      const userId = s.client_reference_id;
      if (!userId || s.metadata?.user_id !== userId || s.metadata?.base44_app_id !== appId) {
        await logEvent("ack_only");
        return Response.json({ received: true, ignored: 'checkout_account_metadata' });
      }

      // Never grant on an unpaid session — wait for the confirmed payment event.
      const paid = s.payment_status === "paid";
      if (!paid) {
        await logEvent("ack_only");
        return Response.json({ received: true, pending: s.payment_status || "unknown" });
      }

      const sub = await getSubscription(apiKey, s.subscription);
      if (!sub) return Response.json({ error: 'Could not retrieve Stripe subscription' }, { status: 503 });
      if (sub.livemode !== event.livemode || sub.customer !== s.customer || sub.metadata?.user_id !== userId || sub.metadata?.base44_app_id !== appId) {
        return Response.json({ received: true, ignored: 'subscription_account_metadata' });
      }
      if (sub.status !== 'active' && sub.status !== 'trialing') {
        return Response.json({ received: true, pending: sub.status });
      }
      const plan = planFromPrice(sub, priceIds);
      // Do NOT default to "pro" — if we can't identify the price, reject so the
      // issue is visible instead of silently granting the wrong plan.
      if (!plan) {
        console.error("stripeWebhook: could not resolve plan from subscription", { subId: s.subscription, mode: test ? "test" : "live" });
        await logEvent("ack_only");
        return Response.json({ received: true, error: "Could not resolve plan from subscription price" });
      }

      // Amount/currency integrity: what the buyer was charged must match the price the
      // plan was resolved from, so a session can never unlock a tier it did not pay for.
      const price = sub?.items?.data?.[0]?.price;
      const expected = Number(price?.unit_amount);
      const charged = Number(s.amount_total);
      const currencyMismatch = !s.currency || s.currency !== price?.currency;
      const amountMismatch = !Number.isSafeInteger(expected) || expected <= 0 || charged !== expected;
      if (currencyMismatch || amountMismatch) {
        console.error("stripeWebhook: amount/currency mismatch — not provisioning", {
          sessionId: s.id, charged, expected, currency: s.currency, priceCurrency: price?.currency,
        });
        await logEvent("ack_only");
        return Response.json({ received: true, error: "Amount or currency mismatch" });
      }

      const periodEnd = periodEndIso(sub);
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
      const periodEnd = periodEndIso(sub);
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
