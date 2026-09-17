// base44/shared/airtableClient.ts
// Shared Airtable REST helpers for the TrainPaceLab → Airtable mirror.
// Used by airtableSync (hourly batch mirror), logErrorToAirtable (frontend crash
// bridge), and errorReport (server-side 500 reporting). Reuses the authorized
// SHARED airtable connector token via base44.asServiceRole — no secrets.
//
// Airtable OAuth scope is schema read-only, so we never create tables/fields;
// every target table already exists in the "Telemetry & AI Coaching Business
// Tracker" base and is addressed by its stable table id below.

export const AIRTABLE_BASE_ID = 'appPJ0dEgcDt0dSNq';

export const TABLES = {
  userErrorReports: 'tblYSWBa9Hd8fCfEg', // "User Error Reports"
  athletes: 'tblrWdA8ysIRKwPa2',         // "Athletes"
  workouts: 'tbljmbzJkGj3jqkG8',         // "Workouts"
  plans: 'tblJuaCWsAPfIXddn',            // "Plans"
  subscribers: 'tblIPgHoshJk33eKD',       // "Subscribers"
  coachRoster: 'tblJAIKUvGzLKWB88',      // "CoachRoster"
  features: 'tblcI8ifzkmNlNSYr',         // "Features"
  systemHealth: 'tblbmAUsLIgZ1kt9Q',     // "System Health Metrics"
  userSegments: 'tblhdWaxBcAlAJuj9',     // "User Segments"
  finances: 'tbl98xAicV8mxRgo0',          // "Finances & Unit Economics"
} as const;

const AIRTABLE_API = 'https://api.airtable.com/v0';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Fetch the shared airtable connector access token. Throws a friendly error if
// the connector isn't connected — callers wrap in try/catch.
export async function getAirtableToken(base44: any): Promise<string> {
  const conn = await base44.asServiceRole.connectors.getConnection('airtable');
  if (!conn?.accessToken) throw new Error('Airtable connector not connected');
  return conn.accessToken;
}

// Paginated list (pageSize=100). Airtable totalRecordCount is Enterprise-only, so
// we page until no offset is returned.
export async function airtableList(token: string, tableId: string): Promise<any[]> {
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

// Batch create (max 10 per request). Returns created record ids in order so
// upsert callers can wire newly-created rows into downstream link maps.
export async function createBatch(token: string, tableId: string, records: any[]): Promise<string[]> {
  if (!records.length) return [];
  const r = await fetch(`${AIRTABLE_API}/${AIRTABLE_BASE_ID}/${tableId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  });
  if (!r.ok) throw new Error(`Airtable create failed (${r.status}): ${await r.text()}`);
  const data = await r.json();
  return (data.records || []).map((rec: any) => rec.id);
}

// Batch update (max 10 per request).
export async function updateBatch(token: string, tableId: string, records: any[]): Promise<void> {
  if (!records.length) return;
  const r = await fetch(`${AIRTABLE_API}/${AIRTABLE_BASE_ID}/${tableId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  });
  if (!r.ok) throw new Error(`Airtable update failed (${r.status}): ${await r.text()}`);
}

// Single-record create (used by the error reporters — errors are infrequent).
export async function airtableCreate(token: string, tableId: string, fields: any): Promise<void> {
  await createBatch(token, tableId, [{ fields }]);
}

// Upsert by a key field: match existing rows on `keyField`, update in place else
// create. Returns counts plus idByKey (key -> Airtable record id) resolved for BOTH
// pre-existing and newly-created rows, so downstream linkers can resolve foreign
// keys within the same run. Airtable upsert-by-non-primary-field needs indexed
// fields we cannot guarantee, so we fetch-all + match in memory.
export async function upsertByKey(
  token: string,
  tableId: string,
  keyField: string,
  rows: any[]
): Promise<{ created: number; updated: number; idByKey: Record<string, string> }> {
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
  for (let i = 0; i < toCreate.length; i += 10) {
    const ids = await createBatch(token, tableId, toCreate.slice(i, i + 10));
    toCreate.slice(i, i + 10).forEach((row, idx) => {
      const key = row.fields[keyField];
      if (key && ids[idx]) idByKey[key] = ids[idx];
    });
    await sleep(250);
  }
  for (let i = 0; i < toUpdate.length; i += 10) {
    await updateBatch(token, tableId, toUpdate.slice(i, i + 10));
    await sleep(250);
  }
  return { created: toCreate.length, updated: toUpdate.length, idByKey };
}

// --- field coercion helpers -------------------------------------------------

// Airtable 'date' fields want YYYY-MM-DD; 'dateTime' fields want a full ISO.
export const toDateOnly = (v: any): string | undefined =>
  v ? String(v).slice(0, 10) : undefined;

export const toISO = (v: any): string | undefined => {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
};

// Only send a singleSelect value if it's in the table's defined options; otherwise
// omit the field (avoids "Invalid select option" write errors).
export const safeSelect = (v: any, allowed: string[]): string | undefined =>
  v && allowed.includes(v) ? v : undefined;

// Coerce to a finite number, or omit (undefined keys are dropped by JSON.stringify
// so they never clear an existing Airtable value on update).
export const num = (v: any): number | undefined => {
  if (v == null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
};