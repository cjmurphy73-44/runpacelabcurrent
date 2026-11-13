// Strict historical coverage gate for workload-based adaptation.
// A day with no session is unknown unless an independent source confirms rest.
// This helper does not infer rest from an empty activity list or from plan entries.
const DATE_KEY = /^\\d{4}-\\d{2}-\\d{2}$/;

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

export function assessDailyLoadCoverage({ startDate, endDate, sessions = [], confirmedRestDates = [], confirmedSyncDates = [] }) {
  if (!validDateKey(startDate) || !validDateKey(endDate) || startDate > endDate) {
    return { complete: false, reason: 'invalid_range', days: [], missingDates: [] };
  }
  const rest = new Set(confirmedRestDates.filter(validDateKey));
  // A successful provider sync proves the provider was queried, NOT that all
  // training sources are complete. Keep this evidence distinct from rest.
  const synced = new Set(confirmedSyncDates.filter(validDateKey));
  const loads = new Map();
  const invalidLoadDates = new Set();
  for (const session of sessions) {
    if (!validDateKey(session?.date)) continue;
    const raw = session.session_trimp ?? session.session_tss;
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
