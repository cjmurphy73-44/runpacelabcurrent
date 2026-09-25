// base44/functions/redeemAccessCode/entry.ts
// Admin-generated access codes for beta testers.
//   - generate (admin): create a code granting a paid plan until an expiry date.
//   - list (admin): list all codes.
//   - redeem (authed user): validate a code and provision the caller's Subscription
//     to the granted plan (status active, current_period_end = expires_at) without
//     Stripe checkout. Increments used_count.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { reportError } from '../../shared/errorReport.ts';

const VALID_PLANS = ['pro', 'unlimited', 'coach_pro'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars

function randomCode() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `TPL-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export default async function (req) {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'generate') {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
      const granted_plan = body.granted_plan;
      if (!VALID_PLANS.includes(granted_plan)) return Response.json({ error: 'Invalid plan' }, { status: 400 });
      const max_uses = Math.max(1, Math.min(1000, Number(body.max_uses) || 1));
      const expires_at = body.expires_at;
      if (!expires_at || isNaN(Date.parse(expires_at))) return Response.json({ error: 'Invalid expiry' }, { status: 400 });
      const code = (body.code || randomCode()).trim().toUpperCase();
      const existing = await base44.asServiceRole.entities.AccessCode.filter({ code });
      if (existing.length > 0) return Response.json({ error: 'Code already exists' }, { status: 409 });
      const rec = await base44.asServiceRole.entities.AccessCode.create({
        code, granted_plan, max_uses, used_count: 0,
        expires_at: new Date(expires_at).toISOString(),
        notes: body.notes || '',
      });
      return Response.json({ success: true, code: rec.code, granted_plan: rec.granted_plan, max_uses: rec.max_uses, expires_at: rec.expires_at });
    }

    if (action === 'list') {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
      const codes = await base44.asServiceRole.entities.AccessCode.list('-created_date', 200);
      return Response.json({ codes });
    }

    if (action === 'redeem') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Sign in to redeem a code' }, { status: 401 });
      const code = (body.code || '').trim().toUpperCase();
      if (!code) return Response.json({ error: 'Enter a code' }, { status: 400 });
      const found = await base44.asServiceRole.entities.AccessCode.filter({ code });
      const entry = found[0];
      if (!entry) return Response.json({ error: 'Invalid code' }, { status: 404 });
      if (entry.expires_at && Date.parse(entry.expires_at) < Date.now()) return Response.json({ error: 'This code has expired' }, { status: 410 });
      if (entry.used_count >= entry.max_uses) return Response.json({ error: 'This code has reached its use limit' }, { status: 410 });

      // Optimistic-lock the claim: increment only if used_count is still what we
      // read, so two concurrent redeems can't both pass the limit check and
      // over-grant a code past its max_uses.
      const before = entry.used_count;
      await base44.asServiceRole.entities.AccessCode.updateMany({ id: entry.id, used_count: before }, { $inc: { used_count: 1 } });
      const after = await base44.asServiceRole.entities.AccessCode.filter({ code });
      const usedNow = after[0]?.used_count;
      if (usedNow === before) {
        return Response.json({ error: 'Code is being redeemed, please retry.' }, { status: 409 });
      }
      if (usedNow > entry.max_uses) {
        await base44.asServiceRole.entities.AccessCode.update(entry.id, { used_count: usedNow - 1 });
        return Response.json({ error: 'This code has reached its use limit' }, { status: 410 });
      }

      const payload = {
        user_id: user.id,
        plan: entry.granted_plan,
        status: 'active',
        current_period_end: entry.expires_at,
      };
      const existing = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id }, '-created_date', 5);
      if (existing[0]) await base44.asServiceRole.entities.Subscription.update(existing[0].id, payload);
      else await base44.asServiceRole.entities.Subscription.create(payload);

      return Response.json({ success: true, plan: entry.granted_plan, expires_at: entry.expires_at });
    }

    return Response.json({ error: `Unknown action: ${action || '(none)'}` }, { status: 400 });
  } catch (error) {
    try { if (base44) await reportError(base44, { source: 'redeemAccessCode', message: error.message, stack: error.stack, severity: 'Medium' }); } catch (e) { console.warn('reportError failed:', e); }
    return Response.json({ error: error.message }, { status: 500 });
  }
}