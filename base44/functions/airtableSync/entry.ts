import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// airtableSync — pushes a live business snapshot (MRR, plan distribution, athlete /
// workout / user counts) into the "Telemetry & AI Coaching Business Tracker" Airtable
// base. Airtable connector (SHARED, builder account) supplies the token; no secrets.
// Airtable has no table/field create scope, so we upsert records into the 5 existing
// strategy tables. Admin-only. Polling-only (Airtable connector has no webhooks).

const AIRTABLE_BASE_ID = 'appPJ0dEgcDt0dSNq';
const TABLES = {
  systemHealth: 'tblbmAUsLIgZ1kt9Q',     // "System Health Metrics"
  userSegments: 'tblhdWaxBcAlAJuj9',     // "User Segments"
  finances: 'tbl98xAicV8mxRgo0',          // "Finances & Unit Economics"
};
// Plan → monthly USD. Pro $19/mo, Team $49/mo (from Stripe product config). Update here
// if pricing changes; the free tier contributes $0.
const PLAN_PRICE = { free: 0, pro: 19, team: 49 };

const AIRTABLE_API = 'https://api.airtable.com/v0';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function airtableList(token: string, tableId: string) {
  const records: any[] = [];
  let offset: string | undefined;
  do {
    const u = new URL(`${AIRTABLE_API}/${AIRTABLE_BASE_ID}/${tableId}`);
    u.searchParams.set('pageSize', '100');
    if (offset) u.searchParams.set('offset', offset);
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Airtable list failed (${r.status}): ${await r.text()}`);
    const data = await r.json();
    records.push(...(data.records || []));
    offset = data.offset;
    if (offset) await sleep(250);
  } while (offset);
  return records;
}

async function airtableBatch(token: string, tableId: string, op: 'create' | 'update', records: any[]) {
  if (!records.length) return;
  const r = await fetch(`${AIRTABLE_API}/${AIRTABLE_BASE_ID}/${tableId}`, {
    method: op === 'create' ? 'POST' : 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  });
  if (!r.ok) throw new Error(`Airtable ${op} failed (${r.status}): ${await r.text()}`);
}

// Upsert by a key field: match existing rows on `keyField`, update in place else create.
async function upsertByKey(token: string, tableId: string, keyField: string, rows: any[]) {
  const existing = await airtableList(token, tableId);
  const idByKey: Record<string, string> = {};
  for (const rec of existing) {
    const v = rec.fields?.[keyField];
    if (typeof v === 'string') idByKey[v] = rec.id;
  }
  const toCreate: any[] = [];
  const toUpdate: any[] = [];
  for (const fields of rows) {
    const key = fields[keyField];
    if (key && idByKey[key]) toUpdate.push({ id: idByKey[key], fields });
    else toCreate.push({ fields });
  }
  for (let i = 0; i < toCreate.length; i += 10) { await airtableBatch(token, tableId, 'create', toCreate.slice(i, i + 10)); await sleep(250); }
  for (let i = 0; i < toUpdate.length; i += 10) { await airtableBatch(token, tableId, 'update', toUpdate.slice(i, i + 10)); await sleep(250); }
  return { created: toCreate.length, updated: toUpdate.length };
}

async function handleSync(base44) {
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  let token: string;
  try {
    const conn = await base44.asServiceRole.connectors.getConnection('airtable');
    token = conn.accessToken;
  } catch (e) {
    return Response.json({ error: 'Airtable connector not connected' }, { status: 503 });
  }

  const [subscriptions, athletes, users, workouts] = await Promise.all([
    base44.asServiceRole.entities.Subscription.list('-created_date', 500),
    base44.asServiceRole.entities.AthleteProfile.list('-created_date', 500),
    base44.asServiceRole.entities.User.list('-created_date', 500),
    base44.asServiceRole.entities.WorkoutSession.list('-created_date', 500),
  ]);

  let mrr = 0;
  const planCounts = { free: 0, pro: 0, team: 0 };
  const planRev = { pro: 0, team: 0 };
  for (const s of subscriptions) {
    if (s.status !== 'active' && s.status !== 'trialing') continue;
    const p = (s.plan || 'free') as keyof typeof PLAN_PRICE;
    const price = PLAN_PRICE[p] ?? 0;
    mrr += price;
    if (planCounts[p] !== undefined) planCounts[p]++;
    if (planRev[p] !== undefined) planRev[p] += price;
  }
  const subscriberUserIds = new Set(subscriptions.map((s) => s.user_id).filter(Boolean));
  planCounts.free = users.filter((u) => !subscriberUserIds.has(u.id)).length;
  const arpuPro = planCounts.pro ? planRev.pro / planCounts.pro : PLAN_PRICE.pro;
  const arpuTeam = planCounts.team ? planRev.team / planCounts.team : PLAN_PRICE.team;
  const now = new Date().toISOString();

  const systemRows = [
    { 'Metric Name': 'Active Subscribers', 'Current Status': String(planCounts.pro + planCounts.team), 'Target Threshold': '>= 50' },
    { 'Metric Name': 'Pro Subscribers', 'Current Status': String(planCounts.pro), 'Target Threshold': '>= 30' },
    { 'Metric Name': 'Team Subscribers', 'Current Status': String(planCounts.team), 'Target Threshold': '>= 10' },
    { 'Metric Name': 'Registered Users', 'Current Status': String(users.length), 'Target Threshold': '>= 100' },
    { 'Metric Name': 'Athlete Profiles', 'Current Status': String(athletes.length), 'Target Threshold': '>= 100' },
    { 'Metric Name': 'Workout Sessions', 'Current Status': String(workouts.length), 'Target Threshold': '>= 1000' },
    { 'Metric Name': 'MRR (USD)', 'Current Status': `$${mrr.toFixed(2)}`, 'Target Threshold': '>= $1000' },
    { 'Metric Name': 'Airtable Sync', 'Current Status': 'OK', 'Last Tested Date': now },
  ];
  const financeRows = [
    { 'Expense or Revenue Category': 'MRR (Monthly Recurring Revenue)', 'Cost Type': 'Revenue', 'Estimated Monthly Cost': mrr },
  ];
  const segmentRows = [
    { 'Segment Name': 'Free / Community', 'Pricing Tier': 'Free', 'Projected ARPU': 0, 'Usage Tier': `${planCounts.free} users` },
    { 'Segment Name': 'Pro Athlete', 'Pricing Tier': 'Pro', 'Projected ARPU': arpuPro, 'Usage Tier': `${planCounts.pro} subscribers` },
    { 'Segment Name': 'Coach / Team', 'Pricing Tier': 'Coach/Team', 'Projected ARPU': arpuTeam, 'Usage Tier': `${planCounts.team} subscribers` },
  ];

  const systemRes = await upsertByKey(token, TABLES.systemHealth, 'Metric Name', systemRows);
  const financeRes = await upsertByKey(token, TABLES.finances, 'Expense or Revenue Category', financeRows);
  const segmentRes = await upsertByKey(token, TABLES.userSegments, 'Segment Name', segmentRows);

  return Response.json({
    success: true,
    snapshot: {
      mrr_usd: mrr,
      plan_counts: planCounts,
      users: users.length,
      athletes: athletes.length,
      workouts: workouts.length,
    },
    airtable: { system_health: systemRes, finances: financeRes, user_segments: segmentRes },
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    if (action === 'sync_business_snapshot') return await handleSync(base44);
    return Response.json({ error: `Unknown action: ${action || '(none)'}` }, { status: 400 });
  } catch (error) {
    console.error('airtableSync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});