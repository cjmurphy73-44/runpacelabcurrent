import { auditDailyHistory, assessDailyLoad, type LoadSession, type DailyLoadEvidence } from './dailyLoadEvidence';

/** Pure, non-mutating load preview. No synthetic zero days or mixed units. */
export function previewVerifiedLoadHistory(
  sessions: LoadSession[],
  days: DailyLoadEvidence[],
  endDate: string,
  options: { timezoneVerified: boolean; completeRead: boolean },
) {
  if (!options?.completeRead) return { eligible: false, code: 'INCOMPLETE_HISTORY_READ', points: [] };
  if (!options?.timezoneVerified) return { eligible: false, code: 'ATHLETE_TIMEZONE_UNVERIFIED', points: [] };
  const audit = auditDailyHistory(sessions, days, endDate);
  if (!audit.eligible) return { eligible: false, code: audit.reason || 'LOAD_HISTORY_UNVERIFIED', points: [] };
  if (audit.unit !== 'trimp') return { eligible: false, code: 'INCOMPATIBLE_LOAD_UNIT', points: [] };

  const dates = [...sessions.map((s) => s.date), ...days.filter((d) => d.confirmed_rest).map((d) => d.date)]
    .filter((d): d is string => typeof d === 'string').sort();
  const start = Date.parse(dates[0] + 'T00:00:00Z');
  const end = Date.parse(endDate + 'T00:00:00Z');
  const rest = new Set(days.filter((d) => d.confirmed_rest).map((d) => d.date));
  const points: { date: string; trimp: number; ctl: number; atl: number; tsb: number; source: string }[] = [];
  let ctl: number | null = null;
  let atl: number | null = null;
  for (let ms = start; ms <= end; ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    const assessment = assessDailyLoad(sessions.filter((s) => s.date === date), rest.has(date));
    if (!assessment.eligible || assessment.load === null) {
      return { eligible: false, code: assessment.reason || 'LOAD_HISTORY_UNVERIFIED', points: [] };
    }
    const load = assessment.load;
    ctl = ctl === null ? load : ctl + (2 / 43) * (load - ctl);
    atl = atl === null ? load : atl + (2 / 8) * (load - atl);
    points.push({ date, trimp: load, ctl, atl, tsb: ctl - atl, source: assessment.source });
  }
  return { eligible: true, code: null, unit: 'trimp' as const, points };
}
