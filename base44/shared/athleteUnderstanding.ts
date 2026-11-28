import { getOwnedAthlete } from './ownership.ts';
import { evidenceAwareAthleteContext } from './athleteEvidence.ts';
import { summarizeCalendarResponse } from './calendarAdaptation.ts';
import { compareMatchedEffort } from './efficiencyComparisons.ts';

// Owner-only read API. Never retrieve the menstrual journal or include its
// existence, contents, or consent state in any analysis or AI prompt.
const NO_STORE = { 'Cache-Control': 'private, no-store' };
const MAX_WORKOUT_ROWS = 2000;
const MAX_RECOVERY_ROWS = 1000;
const PAGE_SIZE = 250;
const HEALTH_FIELDS = ['date', 'hrv', 'resting_hr', 'sleep_duration_hours'];
const WORKOUT_FIELDS = [
  'id', 'athlete_id', 'date', 'sport', 'duration_seconds', 'duration_minutes',
  'distance_km', 'avg_hr', 'avg_power', 'session_trimp', 'session_tss', 'load_source',
];

function reply(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: NO_STORE });
}

async function readScoped(entity: any, athleteId: string, fields: string[], maxRows: number) {
  // Only the recent 90-day window is relevant to these comparisons. Avoid
  // loading years of older activities and failing for experienced athletes.
  const earliestDate = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const rows: any[] = [];
  for (let offset = 0; offset < maxRows; offset += PAGE_SIZE) {
    const page = await entity.filter({ athlete_id: athleteId, date: { $gte: earliestDate } }, '-date', PAGE_SIZE, offset,
      ['athlete_id', ...fields.filter(f => f !== 'athlete_id')]);
    if (!Array.isArray(page) || page.length > PAGE_SIZE) throw new Error('History page unavailable');
    if (page.some(row => row?.athlete_id !== athleteId)) throw new Error('Foreign athlete row');
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
  // A partial history cannot support confident comparisons. Fail closed.
  throw new Error('History exceeds read boundary');
}

export function buildCombinedAthleteUnderstanding(
  workouts: any[], recovery: any[], referenceDate: string,
) {
  const evidence = evidenceAwareAthleteContext(workouts, recovery, referenceDate);
  if (evidence.state !== 'available') {
    return { state: 'unavailable', reason: 'invalid_history_or_date' };
  }
  const calendar = summarizeCalendarResponse(workouts, referenceDate);
  const running = compareMatchedEffort(workouts, referenceDate, 'running');
  const cycling = compareMatchedEffort(workouts, referenceDate, 'cycling');
  return {
    state: 'observational_only',
    schema_version: 1,
    reference_date: referenceDate,
    time_basis: 'UTC_calendar_day',
    history: evidence,
    calendar_load_response: calendar,
    matched_efforts: { running, cycling },
    privacy: { journal_included: false, coach_access_to_journal: false },
    limits: [
      'This report is read-only and cannot diagnose health, injury, fertility or overtraining.',
      'No recorded workout on a day does not prove rest.',
      'An association between recorded effort and speed or power does not prove physiological adaptation.',
      'Weather, terrain, fatigue, pauses and sensor configuration may differ between sessions.',
    ],
  };
}

export async function handleAthleteUnderstanding(base44: any, req: Request) {
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const user = await base44.auth.me().catch(() => null);
  if (!user?.id) return reply({ error: 'Unauthorized' }, 401);
  try {
    const athlete = await getOwnedAthlete(base44, user.id);
    if (!athlete?.id || athlete.created_by_id !== user.id) {
      return reply({ error: 'Athlete not found' }, 404);
    }
    const entities = base44.asServiceRole.entities;
    if (!entities.WorkoutSession || !entities.DailyMetrics) {
      return reply({ state: 'unavailable', reason: 'data_source_unavailable' }, 503);
    }
    const [workouts, recovery] = await Promise.all([
      readScoped(entities.WorkoutSession, athlete.id, WORKOUT_FIELDS, MAX_WORKOUT_ROWS),
      readScoped(entities.DailyMetrics, athlete.id, HEALTH_FIELDS, MAX_RECOVERY_ROWS),
    ]);
    const todayUtc = new Date().toISOString().slice(0, 10);
    return reply(buildCombinedAthleteUnderstanding(workouts, recovery, todayUtc));
  } catch (error) {
    console.warn('athleteUnderstanding', error instanceof Error ? error.name : 'ReadFailure');
    return reply({ state: 'unavailable', reason: 'history_unavailable' }, 503);
  }
}
