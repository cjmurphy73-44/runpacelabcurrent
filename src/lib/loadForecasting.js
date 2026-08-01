// Dynamic fitness/fatigue modeling (Banister's Impulse-Response model) with
// forward projection using scheduled training-plan sessions.

const CTL_DAYS = 42;
const ATL_DAYS = 7;
const K_CTL = 1 - Math.exp(-1 / CTL_DAYS);
const K_ATL = 1 - Math.exp(-1 / ATL_DAYS);

export function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split("T")[0];
}

function addDays(dateKey, n) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

// Rough load estimate for a scheduled (not-yet-completed) session, based on
// prescribed duration and intensity zone — used only for forward projection.
function estimateProjectedLoad(planned) {
  const duration = planned.prescribed_duration_minutes || planned.duration_minutes || 0;
  if (!duration) return 0;
  const zone = `${planned.prescribed_intensity_zone || planned.session_type || ""}`.toLowerCase();
  let factor = 0.7;
  if (/z5|vo2|anaerobic|race|interval|threshold|z4|quality|tempo/.test(zone)) factor = 1.3;
  else if (/z3/.test(zone)) factor = 1.0;
  else if (/z1|recovery|rest/.test(zone)) factor = 0.4;
  return Math.round(duration * factor);
}

// Classifies a TSB (Training Stress Balance) value into a coaching zone.
export function getTsbZoneInfo(tsbValue) {
  if (tsbValue === null || tsbValue === undefined || isNaN(tsbValue)) {
    return {
      label: "Neutral",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      advice: "Not enough data yet.",
    };
  }
  if (tsbValue > 15) {
    return {
      label: "Fresh",
      badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
      advice: "Well-rested — a good window for a hard effort or race.",
    };
  }
  if (tsbValue >= -10) {
    return {
      label: "Neutral",
      badgeClass: "bg-sky-50 text-sky-600 border-sky-200",
      advice: "Balanced form — maintain your current training load.",
    };
  }
  if (tsbValue >= -25) {
    return {
      label: "Optimal",
      badgeClass: "bg-amber-50 text-amber-600 border-amber-200",
      advice: "Productive fatigue — good for building fitness. Monitor recovery.",
    };
  }
  return {
    label: "High Risk",
    badgeClass: "bg-rose-50 text-rose-600 border-rose-200",
    advice: "Deep fatigue — high injury/illness risk. Prioritize recovery.",
  };
}

// Computes historical CTL/ATL/TSB from completed sessions, then projects the
// same EWMA forward through `daysAhead` days using scheduled plannedWorkouts.
export function calculateHistoricalAndProjectedLoad(completedSessions = [], plannedWorkouts = [], daysAhead = 7) {
  const loadByDate = {};
  for (const s of completedSessions) {
    if (!s?.date) continue;
    const key = toDateKey(s.date);
    const load = s.session_trimp || s.session_tss || 0;
    loadByDate[key] = (loadByDate[key] || 0) + load;
  }

  const historicalDates = Object.keys(loadByDate).sort();
  if (historicalDates.length === 0) return [];

  const todayKey = toDateKey(new Date());
  const earliestDate = historicalDates[0];

  const plannedLoadByDate = {};
  for (const p of plannedWorkouts) {
    if (!p?.date) continue;
    const key = toDateKey(p.date);
    plannedLoadByDate[key] = (plannedLoadByDate[key] || 0) + estimateProjectedLoad(p);
  }

  const endDate = addDays(todayKey, daysAhead);

  const points = [];
  let ctl = 0;
  let atl = 0;
  let cursor = earliestDate;
  let isFirstDay = true;

  while (cursor <= endDate) {
    const isProjected = cursor > todayKey;
    const dailyTss = isProjected ? plannedLoadByDate[cursor] || 0 : loadByDate[cursor] || 0;

    if (isFirstDay) {
      ctl = dailyTss;
      atl = dailyTss;
      isFirstDay = false;
    } else {
      ctl = ctl + K_CTL * (dailyTss - ctl);
      atl = atl + K_ATL * (dailyTss - atl);
    }

    const tsb = ctl - atl;
    points.push({
      date: cursor,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
      isProjected,
      dailyTss: Math.round(dailyTss * 10) / 10,
      zone: getTsbZoneInfo(tsb).label,
    });

    cursor = addDays(cursor, 1);
  }

  return points;
}