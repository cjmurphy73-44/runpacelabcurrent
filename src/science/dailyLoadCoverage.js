// Strict historical coverage gate for workload-based adaptation.
// A day with no session is unknown unless an independent source confirms rest.
// This helper does not infer rest from an empty activity list or from plan entries.
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function validDateKey(key) {
  if (typeof key !== 'string' || !DATE_KEY.test(key)) return false;
  const date = new Date(key + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key;
}

function nextDay(key) {
  const date = new Date(key + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function assessDailyLoadCoverage({ startDate, endDate, sessions = [], confirmedRestDates = [], confirmedSyncDates = [], loadMetric = null }) {
  if (!validDateKey(startDate) || !validDateKey(endDate) || startDate > endDate) {
    return { complete: false, reason: 'invalid_range', days: [], missingDates: [] };
  }
  const spanDays = (Date.parse(endDate + 'T00:00:00Z') - Date.parse(startDate + 'T00:00:00Z')) / 86400000;
  if (spanDays > 3650) {
    return { complete: false, reason: 'range_too_long', days: [], missingDates: [] };
  }
  if (!['trimp', 'tss'].includes(loadMetric)) {
    return { complete: false, reason: 'load_metric_required', days: [], missingDates: [] };
  }
  if (!Array.isArray(sessions) || !Array.isArray(confirmedRestDates) || !Array.isArray(confirmedSyncDates)) {
    return { complete: false, reason: 'invalid_evidence', days: [], missingDates: [] };
  }
  const rest = new Set(confirmedRestDates.filter(validDateKey));
  // A successful provider sync proves the provider was queried, NOT that all
  // training sources are complete. Keep this evidence distinct from rest.
  const synced = new Set(confirmedSyncDates.filter(validDateKey));
  const loads = new Map();
  const invalidLoadDates = new Set();
  for (const session of sessions) {
    if (!validDateKey(session?.date)) continue;
    // A session must carry the explicitly selected metric; never substitute
    // TSS for TRIMP or vice versa, even if the other field is populated.
    const raw = loadMetric === 'trimp' ? session.session_trimp : session.session_tss;
    if (raw == null || typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
      invalidLoadDates.add(session.date);
      continue;
    }
    loads.set(session.date, (loads.get(session.date) ?? 0) + raw);
  }
  const days = [];
  const missingDates = [];
  for (let date = startDate; date <= endDate; date = nextDay(date)) {
    const invalid = invalidLoadDates.has(date);
    const measured = loads.has(date);
    const confirmedRest = rest.has(date) && !measured && !invalid;
    const status = invalid ? 'invalid_load' : measured ? 'recorded' : confirmedRest ? 'confirmed_rest' : 'unknown';
    if (status === 'unknown' || status === 'invalid_load') missingDates.push(date);
    days.push({
      date,
      status,
      load: status === 'recorded' ? loads.get(date) : status === 'confirmed_rest' ? 0 : null,
      syncObserved: synced.has(date),
    });
  }
  return {
    complete: missingDates.length === 0,
    reason: missingDates.length ? 'missing_or_invalid_days' : null,
    days,
    missingDates,
  };
}

// Only complete histories may become input to an adaptive model.
// Do not silently fill gaps with zero, even after a successful device sync.
export function verifiedDailyLoadForAdaptation(input) {
  const coverage = assessDailyLoadCoverage(input);
  if (!coverage.complete) return { eligible: false, reason: coverage.reason, dailyLoads: [], missingDates: coverage.missingDates };
  return { eligible: true, reason: null, dailyLoads: coverage.days.map(({ date, load }) => ({ date, load })), missingDates: [] };
}


// Forward modelling must consume verified calendar coverage, not raw session lists.
// Explicit future loads must be provided in the SAME load unit as historical days.
// An absent planned day is a zero-load scenario assumption, not a confirmed rest day.
export function forecastVerifiedDailyLoad(input, { futureDailyLoads = [], daysAhead = 7 } = {}) {
  const verified = verifiedDailyLoadForAdaptation(input);
  if (!verified.eligible) return { eligible: false, reason: verified.reason, points: [], missingDates: verified.missingDates };
  if (!Number.isInteger(daysAhead) || daysAhead < 0 || daysAhead > 365 || verified.dailyLoads.length === 0) {
    return { eligible: false, reason: 'invalid_horizon_or_history', points: [], missingDates: [] };
  }
  if (!Array.isArray(futureDailyLoads)) {
    return { eligible: false, reason: 'invalid_planned_load', points: [], missingDates: [] };
  }
  const forecastEnd = (() => { let date = input.endDate; for (let i = 0; i < daysAhead; i += 1) date = nextDay(date); return date; })();
  const planned = new Map();
  for (const day of futureDailyLoads) {
    if (!validDateKey(day?.date) || day.date <= input.endDate || day.date > forecastEnd || day.loadMetric !== input.loadMetric || typeof day.load !== 'number' || !Number.isFinite(day.load) || day.load < 0) {
      return { eligible: false, reason: 'invalid_planned_load', points: [], missingDates: [] };
    }
    planned.set(day.date, (planned.get(day.date) ?? 0) + day.load);
  }
  // This is an EWMA scenario, not a calibrated Banister performance prediction.
  const kCtl = 1 - Math.exp(-1 / 42);
  const kAtl = 1 - Math.exp(-1 / 7);
  const points = [];
  let ctl = null;
  let atl = null;
  const push = (date, load, isProjected) => {
    ctl = ctl === null ? load : ctl + kCtl * (load - ctl);
    atl = atl === null ? load : atl + kAtl * (load - atl);
    points.push({ date, ctl, atl, tsb: ctl - atl, dailyLoad: load, isProjected });
  };
  for (const day of verified.dailyLoads) push(day.date, day.load, false);
  let cursor = input.endDate;
  for (let i = 0; i < daysAhead; i += 1) {
    cursor = nextDay(cursor);
    push(cursor, planned.get(cursor) ?? 0, true);
  }
  return { eligible: true, reason: null, points, missingDates: [], loadMetric: input.loadMetric, projectedAssumptions: 'unscheduled_future_days_zero' };
}
