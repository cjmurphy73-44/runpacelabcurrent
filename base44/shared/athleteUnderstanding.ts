import { getOwnedAthlete } from './ownership.ts';

const DAY_MS = 86_400_000;
const NO_STORE = { 'Cache-Control': 'private, no-store' };

function normalizedDay(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const stamp = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? stamp : null;
}

function round(value: number) { return Math.round(value * 10) / 10; }

export function summarizeAthleteUnderstanding(
  history: any[], recovery: any[], today: string,
) {
  const now = normalizedDay(today);
  if (now === null || !Array.isArray(history) || !Array.isArray(recovery)) {
    return { state: 'unavailable', reason: 'invalid_history' };
  }
  const sessionsById = new Map<string, any>();
  for (const workout of history) {
    if (!workout || typeof workout.id !== 'string') continue;
    const day = normalizedDay(workout.date);
    if (day === null || day > now || day < now - 28 * DAY_MS) continue;
    const duration = Number(workout.duration_minutes);
    if (!Number.isFinite(duration) || duration < 0) continue;
    sessionsById.set(workout.id, { ...workout, day, duration });
  }
  const sessions = [...sessionsById.values()];
  const thisWeek = sessions.filter(s => s.day > now - 7 * DAY_MS);
  const prevWeek = sessions.filter(s => s.day <= now - 7 * DAY_MS && s.day > now - 14 * DAY_MS);
  const sumMinutes = (items: any[]) => items.reduce((total, w) => total + w.duration, 0);
  const minutes = sumMinutes(thisWeek), previousMinutes = sumMinutes(prevWeek);
  const streamCount = thisWeek.filter(s => s.load_source === 'stream').length;
  const summaryCount = thisWeek.filter(s => s.load_source === 'summary').length;
  const missingCount = thisWeek.length - streamCount - summaryCount;
  const loadValues = thisWeek.map(s => {
    const trimp = Number(s.session_trimp);
    const tss = Number(s.session_tss);
    return Number.isFinite(trimp) && trimp > 0 ? trimp :
      Number.isFinite(tss) && tss > 0 ? tss : null;
  });
  const knownLoad = loadValues.filter((value): value is number => value !== null);
  const recoveryDays = new Set(recovery
    .filter(r => normalizedDay(r?.date) !== null && normalizedDay(r.date)! > now - 7 * DAY_MS &&
      normalizedDay(r.date)! <= now &&
      ['sleep_score', 'sleep_duration_hours', 'hrv', 'hrv_score', 'resting_hr'].some(key =>
        Number.isFinite(Number(r[key])) && r[key] !== null && r[key] !== undefined))
    .map(r => r.date));
  return {
    state: 'available', reference_date: today,
    time_window: 'last_7_complete_calendar_days_including_today',
    workout_count: thisWeek.length,
    active_days: new Set(thisWeek.map(s => s.date)).size,
    minutes: round(minutes),
    prior_week: prevWeek.length ? { workouts: prevWeek.length, minutes: round(previousMinutes) } : null,
    sports: [...new Set(thisWeek.map(s => s.sport).filter(Boolean))],
    training_load: { known_sessions: knownLoad.length, total_known: round(knownLoad.reduce((a, b) => a + b, 0)),
      missing_sessions: thisWeek.length - knownLoad.length },
    source_quality: { full_stream: streamCount, summary: summaryCount, unclassified: missingCount },
    recovery_evidence: { days_with_measurements: recoveryDays.size, readiness_from_recovery:
      recoveryDays.size > 0 ? 'signals_available' : 'insufficient_recovery_data' },
    context: [
      ...(sessions.length === 0 ? ['No recent saved workouts; reconnect or import training to populate this view.'] : []),
      ...(thisWeek.length && !streamCount ? ['No stream-backed workouts in the last seven days. Detailed zone conclusions may be limited.'] : []),
      ...(recoveryDays.size === 0 ? ['No recovery measurements this week. Avoid treating training form alone as readiness.'] : []),
    ],
    disclaimer: 'Observational summary only. Not a diagnosis, clearance to train, inferred cycle phase or automated prescription.',
  };
}

async function readScoped(entity: any, athleteId: string, fields: string[], cap: number) {
  const pageSize = 250;
  const all: any[] = [];
  for (let skip = 0; skip < cap; skip += pageSize) {
    const page = await entity.filter({ athlete_id: athleteId }, '-date', pageSize, skip, fields);
    if (!Array.isArray(page)) throw new Error('Invalid entity page');
    if (page.some(row => row?.athlete_id && row.athlete_id !== athleteId)) throw new Error('Owner mismatch');
    all.push(...page);
    if (page.length < pageSize) return all;
  }
  throw new Error('History limit exceeded; return no partial decision');
}

export async function handleAthleteUnderstanding(base44: any, req: Request) {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: NO_STORE });
  const user = await base44.auth.me().catch(() => null);
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete || athlete.created_by_id !== user.id) {
    return Response.json({ error: 'Athlete not found' }, { status: 404, headers: NO_STORE });
  }
  try {
    const entities = base44.asServiceRole.entities;
    const [workouts, recovery] = await Promise.all([
      readScoped(entities.WorkoutSession, athlete.id,
        ['id','athlete_id','date','sport','duration_minutes','session_trimp','session_tss','load_source'], 2000),
      readScoped(entities.DailyMetrics, athlete.id,
        ['id','athlete_id','date','sleep_score','sleep_duration_hours','hrv','hrv_score','resting_hr'], 1000),
    ]);
    return Response.json(summarizeAthleteUnderstanding(workouts, recovery,
      new Date().toISOString().slice(0, 10)), { headers: NO_STORE });
  } catch (error) {
    console.warn('athlete understanding unavailable', error instanceof Error ? error.name : 'ReadError');
    return Response.json({ state: 'unavailable', reason: 'history_unavailable' }, { status: 503, headers: NO_STORE });
  }
}
