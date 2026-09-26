// base44/functions/ingestLabResult/entry.ts
// Lab-result ingestion endpoint. Accepts a manual entry or a CSV-parsed rows array,
// normalizes each row into a CanonicalSample (stream_type 'lab') and persists
// LabResult records. Lab data then feeds the timeline reconciler + AI synthesis
// alongside wearable/sleep data. The frontend Imports page can push rows here via
// base44.functions.invoke('ingestLabResult', { athlete_id, rows, source }).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { labRowToCanonical } from '../../shared/canonicalSample.ts';
import { reportError } from '../../shared/errorReport.ts';

const VALID_TEST_TYPES = ['blood_panel', 'lactate_threshold', 'vo2max', 'ferritin', 'hemoglobin', 'iron', 'vitamin_d', 'cortisol', 'other'];

function parseRows(body) {
  // Accept either { rows: [...] } or a raw array, or a CSV string.
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.rows)) return body.rows;
  if (typeof body?.csv === 'string') return parseCsv(body.csv);
  return [];
}

// Minimal, defensive CSV parser: header row + comma-delimited values. Expected
// columns: date,test_type,metric_name,value,unit,reference_low,reference_high,notes
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const row = {};
    headers.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); });
    out.push(row);
  }
  return out;
}

function coerceRow(raw) {
  const date = raw.date || raw.sample_date;
  const test_type = (raw.test_type || 'other').toString().toLowerCase();
  const metric_name = raw.metric_name || raw.metric || raw.name;
  const value = raw.value != null ? Number(raw.value) : NaN;
  const unit = raw.unit || '';
  const reference_low = raw.reference_low != null && raw.reference_low !== '' ? Number(raw.reference_low) : null;
  const reference_high = raw.reference_high != null && raw.reference_high !== '' ? Number(raw.reference_high) : null;
  const notes = raw.notes || '';
  return { date, test_type, metric_name, value, unit, reference_low, reference_high, notes };
}

export default async function(req) {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const athleteId = body.athlete_id;
    if (!athleteId) return Response.json({ error: 'athlete_id required' }, { status: 400 });

    // Ownership: athlete must be owned by the caller (or admin).
    const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athleteId).catch(() => null);
    if (!athlete) return Response.json({ error: 'Athlete not found' }, { status: 404 });
    if (athlete.created_by_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const source = (body.source === 'csv' || body.source === 'lab_portal') ? body.source : 'manual';
    const rawRows = parseRows(body);
    if (!rawRows.length) return Response.json({ error: 'No rows provided' }, { status: 400 });

    const records = [];
    const canonical = [];
    let skipped = 0;
    for (const raw of rawRows) {
      const r = coerceRow(raw);
      if (!r.date || !r.metric_name || !isFinite(r.value)) { skipped++; continue; }
      const test_type = VALID_TEST_TYPES.includes(r.test_type) ? r.test_type : 'other';
      const sample = labRowToCanonical(athleteId, { date: r.date, metric_name: r.metric_name, value: r.value, unit: r.unit, reference_low: r.reference_low, reference_high: r.reference_high });
      if (!sample) { skipped++; continue; }
      canonical.push(sample);
      records.push({
        athlete_id: athleteId,
        created_by_id: user.id,
        date: r.date,
        test_type,
        metric_name: r.metric_name,
        value: r.value,
        unit: r.unit,
        reference_low: r.reference_low ?? undefined,
        reference_high: r.reference_high ?? undefined,
        notes: r.notes || undefined,
        source,
      });
    }

    if (!records.length) return Response.json({ error: 'No valid lab rows after parsing', skipped }, { status: 400 });

    const created = await base44.asServiceRole.entities.LabResult.bulkCreate(records);
    return Response.json({ ingested: created.length, canonical_samples: canonical.length, skipped });
  } catch (error) {
    try { if (base44) await reportError(base44, { source: 'ingestLabResult', message: error.message, stack: error.stack, severity: 'Medium' }); } catch (e) { console.warn('reportError failed:', e); }
    return Response.json({ error: error.message }, { status: 500 });
  }
}