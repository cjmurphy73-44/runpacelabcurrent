import { getOwnedAthlete } from './ownership.ts';
import { readLimitedJson } from './requestJson.ts';

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' };
const SYMPTOMS = new Set(['cramps', 'headache', 'fatigue', 'bloating', 'mood_change', 'breast_tenderness', 'sleep_disruption', 'other']);
const FLOWS = new Set(['none', 'spotting', 'light', 'medium', 'heavy']);
const CONSENT_VERSION = 'health-journal-v1';
const MAX_HISTORY_ROWS = 90;
const MAX_EXPORT_ROWS = 5000;

function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: PRIVATE_HEADERS });
}

function validDate(date: unknown): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const timestamp = Date.parse(date + 'T00:00:00Z');
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date &&
    // Accept an athlete's current local date even when their timezone is ahead of UTC.
    date <= new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

export function validateHealthJournalEntry(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  const allowed = ['date', 'period_started', 'flow', 'symptoms', 'symptom_severity', 'energy', 'notes'];
  if (!validDate(row.date) || Object.keys(row).some(key => !allowed.includes(key))) return null;
  const entry: Record<string, unknown> = { date: row.date };
  if (row.period_started !== undefined) {
    if (typeof row.period_started !== 'boolean') return null;
    entry.period_started = row.period_started;
  }
  if (row.flow !== undefined) {
    if (typeof row.flow !== 'string' || !FLOWS.has(row.flow)) return null;
    entry.flow = row.flow;
  }
  if (row.symptoms !== undefined) {
    if (!Array.isArray(row.symptoms) || row.symptoms.length > 8 ||
        !row.symptoms.every(s => typeof s === 'string' && SYMPTOMS.has(s)) ||
        new Set(row.symptoms).size !== row.symptoms.length) return null;
    entry.symptoms = row.symptoms;
  }
  if (row.symptom_severity !== undefined) {
    if (!Number.isInteger(row.symptom_severity) || (row.symptom_severity as number) < 0 || (row.symptom_severity as number) > 4) return null;
    entry.symptom_severity = row.symptom_severity;
  }
  if (row.energy !== undefined) {
    if (!Number.isInteger(row.energy) || (row.energy as number) < 1 || (row.energy as number) > 5) return null;
    entry.energy = row.energy;
  }
  if (row.notes !== undefined) {
    if (typeof row.notes !== 'string' || row.notes.length > 500) return null;
    entry.notes = row.notes;
  }
  if (Object.keys(entry).length === 1) return null;
  return entry;
}

export async function handleAthleteHealthJournal(base44: any, req: Request, enabled: boolean) {
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const user = await base44.auth.me().catch(() => null);
  if (!user?.id) return reply({ error: 'Unauthorized' }, 401);
  // Disabling collection must never strand previously recorded sensitive data.
  // Existing owner-only access, export, deletion and consent withdrawal remain
  // available; no opt-in or new writes can occur while the feature is off.
  const disabledAccess = new Set(['status', 'list', 'export', 'delete_day', 'erase_all']);

  let input: any;
  try {
    input = await readLimitedJson(req, 8192);
  } catch {
    return reply({ error: 'Invalid request' }, 400);
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reply({ error: 'Invalid request' }, 400);
  if (!['status', 'enable', 'list', 'export', 'save', 'delete_day', 'erase_all'].includes(input.action)) return reply({ error: 'Unknown action' }, 400);
  if (!enabled && !disabledAccess.has(input.action)) {
    return reply({ available: false, error: 'New private-journal collection is disabled.' }, 503);
  }

  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete?.id || athlete.created_by_id !== user.id) return reply({ error: 'Athlete not found' }, 404);
  // Unlike the training plan, menstrual information is NEVER accessible by an assigned coach.
  const { AthleteHealthConsent: consents, AthleteHealthJournal: entries } = base44.asServiceRole.entities;
  if (!consents || !entries) return reply({ error: 'Health journal storage unavailable' }, 503);
  try {
    const existing = await consents.filter({ athlete_id: athlete.id }, '-created_date', 2);
    if (!Array.isArray(existing) || existing.some((r: any) => r.athlete_id !== athlete.id) ||
        existing.length > 1) throw new Error('Unexpected consent state');
    const consent = existing[0] ?? null;
    if (input.action === 'status') {
      if (!enabled) {
        // Find surviving journal data even if a prior interrupted deletion
        // removed consent first. Do not reveal details or contents in status.
        const remaining = await entries.filter({ athlete_id: athlete.id }, '-date', 1);
        if (!Array.isArray(remaining) ||
            remaining.some((r: any) => r.athlete_id !== athlete.id)) {
          throw new Error('Unexpected journal owner');
        }
        return reply({ available: false, enabled: false,
          can_manage_existing: Boolean(consent || remaining.length),
          coach_access: false, ai_access: false });
      }
      return reply({ available: true, enabled: consent?.enabled === true,
        coach_access: false, ai_access: false });
    }

    if (input.action === 'enable') {
      if (input.acknowledged !== true) return reply({ error: 'Explicit privacy consent required' }, 400);
      const now = new Date().toISOString();
      await consents.upsert([{
        athlete_id: athlete.id, enabled: true, consent_version: CONSENT_VERSION,
        consented_at: now, updated_at: now, share_with_coach: false,
      }], { key: ['athlete_id'] });
      return reply({ enabled: true, coach_access: false, ai_access: false });
    }
    if (input.action === 'erase_all') {
      if (input.confirm !== 'DELETE') return reply({ error: 'Explicit deletion confirmation required' }, 400);
      // Delete in bounded batches; never remove consent until all records have been erased.
      for (let batch = 0; batch < 100; batch++) {
        const page = await entries.filter({ athlete_id: athlete.id }, '-date', 100);
        if (!Array.isArray(page)) throw new Error('Journal deletion could not verify records');
        if (!page.length) break;
        for (const row of page) {
          if (row.athlete_id !== athlete.id || !row.id) throw new Error('Unexpected journal row');
          await entries.delete(row.id);
        }
        if (page.length < 100) break;
        if (batch === 99) throw new Error('Too many journal rows');
      }
      // The delete API may acknowledge a request without a durable write.
      // Verify active storage is empty before revoking consent or reporting
      // success; a partially deleted journal must remain recoverable to its owner.
      const remaining = await entries.filter({ athlete_id: athlete.id }, '-date', 1);
      if (!Array.isArray(remaining) || remaining.length !== 0) {
        throw new Error('Journal deletion could not be verified');
      }
      if (consent?.id) await consents.delete(consent.id);
      // Base44 entity.delete removes records from active queries, but retains
      // recoverable trash and may retain version-history/backups. Do not claim
      // immediate permanent erasure until a separate documented purge process
      // and retention schedule are verified.
      return reply({ enabled: false, removed_from_active_journal: true,
        permanent_erasure_verified: false });
    }
    if (consent?.enabled !== true && enabled) {
      return reply({ error: 'Opt in before using the private journal' }, 403);
    }
    // When collection is disabled, the permitted actions from disabledAccess
    // can retrieve or remove existing rows without renewing consent.

    if (input.action === 'export') {
      // Explicit owner-only export. Keep the complete journal separate from
      // coach, AI, user-profile and workout data flows.
      const exported: Record<string, unknown>[] = [];
      for (let offset = 0; offset < MAX_EXPORT_ROWS; offset += 100) {
        const page = await entries.filter({ athlete_id: athlete.id }, '-date', 100, offset);
        if (!Array.isArray(page)) throw new Error('Journal export failed');
        for (const row of page) {
          if (row.athlete_id !== athlete.id) throw new Error('Unexpected journal owner');
          exported.push({
            date: row.date, period_started: row.period_started, flow: row.flow,
            symptoms: row.symptoms, symptom_severity: row.symptom_severity,
            energy: row.energy, notes: row.notes, recorded_at: row.recorded_at,
          });
        }
        if (page.length < 100) return reply({
          version: CONSENT_VERSION, exported_at: new Date().toISOString(),
          entries: exported, complete: true, coach_access: false, ai_access: false,
        });
      }
      // Never misrepresent a truncated sensitive-data export as complete.
      return reply({ error: 'Journal exceeds single-export limit; contact support for a complete export.' }, 409);
    }
    if (input.action === 'list') {
      const page = await entries.filter({ athlete_id: athlete.id }, '-date', MAX_HISTORY_ROWS);
      if (!Array.isArray(page) || page.some((r: any) => r.athlete_id !== athlete.id)) {
        throw new Error('Unexpected journal owner');
      }
      const rows = page.map((r: any) => ({
        date: r.date, period_started: r.period_started, flow: r.flow,
        symptoms: r.symptoms, symptom_severity: r.symptom_severity, energy: r.energy, notes: r.notes,
      }));
      return reply({ entries: rows, limited: rows.length >= MAX_HISTORY_ROWS });
    }
    if (input.action === 'save') {
      const entry = validateHealthJournalEntry(input.entry);
      if (!entry) return reply({ error: 'Invalid self-reported health entry' }, 400);
      await entries.upsert([{ ...entry, athlete_id: athlete.id, recorded_at: new Date().toISOString() }],
        { key: ['athlete_id', 'date'] });
      return reply({ saved: true, date: entry.date });
    }
    if (!validDate(input.date)) return reply({ error: 'Invalid date' }, 400);
    const rows = await entries.filter({ athlete_id: athlete.id, date: input.date }, '-date', 3);
    if (!Array.isArray(rows) || rows.length > 1) throw new Error('Unexpected journal day state');
    for (const row of rows) {
      if (row.athlete_id !== athlete.id || row.date !== input.date) throw new Error('Unexpected journal row');
      await entries.delete(row.id);
    }
    return reply({ deleted: true, date: input.date });
  } catch (error) {
    console.error('athleteHealthJournal failed:', error instanceof Error ? error.name : 'StorageError');
    return reply({ error: 'Private journal operation could not be completed' }, 503);
  }
}
