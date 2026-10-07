// base44/shared/planValidation.ts
// Validation helpers for AI-generated training plans and adaptive adjustments.
// Prevents malformed, out-of-bounds, or unsafe AI output from being persisted
// or applied to an athlete's training schedule. Used by generateTrainingPlan,
// commitTrainingPlan, autoReplanOnDeviation, and requestMicroadjustment.
//
// Design principle: the LLM is advisory — the server is authoritative. AI
// output is validated against known constraints (supported sports/zones,
// bounded durations, expected calendar dates, known session ids) before
// anything is written. When validation fails the caller returns a clear,
// recoverable error without partially applying changes.

const SUPPORTED_SPORTS = ['running', 'cycling', 'swimming', 'strength', 'triathlon', 'other'];
const MAX_DURATION_MIN = 600; // 10 h — anything beyond is implausible for a single session

function isSupportedSport(sport: any): boolean {
  if (!sport || typeof sport !== 'string') return false;
  return SUPPORTED_SPORTS.includes(sport);
}

function isSupportedZone(zone: any): boolean {
  if (!zone || typeof zone !== 'string') return true; // empty zone allowed (rest days)
  const z = zone.trim();
  if (['rest', 'recovery', 'easy', 'tempo', 'threshold', 'interval', 'long', 'race'].includes(z.toLowerCase())) return true;
  return /^z[1-5]$/i.test(z);
}

function isValidDuration(d: any): boolean {
  return typeof d === 'number' && Number.isFinite(d) && d >= 0 && d <= MAX_DURATION_MIN;
}

function isISODate(s: any): boolean {
  if (!s || typeof s !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  sanitized: any | null;
}

/**
 * Validate the structure of an LLM-generated training plan before persisting.
 * When `expectedWeekDates` is supplied, every day's date must appear in that
 * calendar. Returns a sanitized copy safe to persist, or errors explaining
 * why the plan was rejected.
 */
export function validatePlanStructure(plan: any, expectedWeekDates: any[] | null): PlanValidationResult {
  const errors: string[] = [];
  if (!plan || typeof plan !== 'object') {
    return { valid: false, errors: ['Plan is empty or not an object'], sanitized: null };
  }

  if (!plan.plan_title || typeof plan.plan_title !== 'string') {
    errors.push('Missing or invalid plan_title');
  }

  if (!Array.isArray(plan.weekly_plans) || plan.weekly_plans.length === 0) {
    return { valid: false, errors: ['weekly_plans must be a non-empty array'], sanitized: null };
  }

  const expectedDateSet = new Set<string>();
  if (expectedWeekDates) {
    for (const w of expectedWeekDates) {
      for (const d of (w.days || [])) expectedDateSet.add(d);
    }
  }

  const sanitizedWeeks: any[] = [];
  for (let wi = 0; wi < plan.weekly_plans.length; wi++) {
    const week = plan.weekly_plans[wi];
    if (!week || typeof week !== 'object') { errors.push(`Week ${wi + 1}: not an object`); continue; }
    if (typeof week.week_number !== 'number') errors.push(`Week ${wi + 1}: missing week_number`);
    if (!Array.isArray(week.days) || week.days.length === 0) {
      errors.push(`Week ${wi + 1}: days must be a non-empty array`);
      continue;
    }
    const sanitizedDays: any[] = [];
    for (let di = 0; di < week.days.length; di++) {
      const day = week.days[di];
      if (!day || typeof day !== 'object') { errors.push(`Week ${wi + 1} day ${di + 1}: not an object`); continue; }
      if (!isISODate(day.date)) {
        errors.push(`Week ${wi + 1} day ${di + 1}: invalid date "${day.date}"`);
      } else if (expectedDateSet.size > 0 && !expectedDateSet.has(day.date)) {
        errors.push(`Week ${wi + 1} day ${di + 1}: date "${day.date}" not in expected calendar`);
      }
      const sport = day.sport || 'running';
      if (!isSupportedSport(sport)) {
        errors.push(`Week ${wi + 1} day ${di + 1}: unsupported sport "${sport}"`);
      }
      const isRest = (day.session_type || '').toLowerCase() === 'rest';
      if (!isRest && !isValidDuration(day.prescribed_duration_minutes)) {
        errors.push(`Week ${wi + 1} day ${di + 1}: invalid duration ${day.prescribed_duration_minutes}`);
      }
      if (day.prescribed_intensity_zone && !isSupportedZone(day.prescribed_intensity_zone)) {
        errors.push(`Week ${wi + 1} day ${di + 1}: unsupported zone "${day.prescribed_intensity_zone}"`);
      }
      sanitizedDays.push({
        date: day.date,
        day_name: day.day_name || '',
        session_type: day.session_type || 'rest',
        sport: isSupportedSport(sport) ? sport : 'running',
        title: day.title || '',
        prescribed_duration_minutes: isValidDuration(day.prescribed_duration_minutes)
          ? Math.round(day.prescribed_duration_minutes) : 0,
        prescribed_intensity_zone: day.prescribed_intensity_zone || '',
        description: day.description || '',
      });
    }
    sanitizedWeeks.push({ ...week, days: sanitizedDays });
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? { ...plan, weekly_plans: sanitizedWeeks } : null,
  };
}

export interface AdjustmentValidationResult {
  accepted: any[];
  rejected: { id?: string; reason: string }[];
}

/**
 * Validate LLM adjustment results against the supplied upcoming sessions.
 * Only adjustments targeting a known upcoming session id, with in-bounds
 * values, are accepted. Rejected adjustments are surfaced for diagnostics.
 */
export function validateAdjustments(adjustments: any[], upcomingSessions: any[]): AdjustmentValidationResult {
  const validIds = new Set((upcomingSessions || []).map((s) => s.id));
  const accepted: any[] = [];
  const rejected: { id?: string; reason: string }[] = [];

  for (const adj of adjustments || []) {
    if (!adj || !adj.id) { rejected.push({ reason: 'Missing adjustment id' }); continue; }
    if (!validIds.has(adj.id)) {
      rejected.push({ id: adj.id, reason: 'Session id not among upcoming sessions' });
      continue;
    }
    if (!isValidDuration(adj.new_duration_minutes)) {
      rejected.push({ id: adj.id, reason: `Duration out of bounds: ${adj.new_duration_minutes}` });
      continue;
    }
    if (adj.new_intensity_zone && !isSupportedZone(adj.new_intensity_zone)) {
      rejected.push({ id: adj.id, reason: `Unsupported zone: ${adj.new_intensity_zone}` });
      continue;
    }
    accepted.push({
      id: adj.id,
      prescribed_duration_minutes: Math.round(adj.new_duration_minutes),
      prescribed_intensity_zone: adj.new_intensity_zone || undefined,
      rationale_text: typeof adj.rationale === 'string' ? adj.rationale : '',
      status: 'modified',
    });
  }

  return { accepted, rejected };
}