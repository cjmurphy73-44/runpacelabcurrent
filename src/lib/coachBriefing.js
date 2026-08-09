// Pure helper — derives a short, dated "coach briefing" from current fitness data.
// Used by CoachMessageFeed so the dashboard's "Coach updates" reflects live analysis
// of recent workouts and trends, not just stored CoachMessage records.

function avg(nums) {
  if (!nums || nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function fmtMin(min) {
  const m = Math.round(min || 0);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${r}m` : `${r}m`;
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

// Signed integer label: "+5" / "-2" — never "+-2".
function sign(n) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(0)}`;
}

export function computeCoachBriefing(workoutSessions, dailyMetrics) {
  const updates = [];
  const sessions = [...(workoutSessions || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const metrics = [...(dailyMetrics || [])].sort((a, b) => (a.date || "").localeCompare(b.date || "")); // ascending

  if (!sessions.length && !metrics.length) return updates;

  const today = new Date();
  const daysAgo = (d) => {
    if (!d) return Infinity;
    const diff = (today - new Date(d)) / 86400000;
    return isNaN(diff) ? Infinity : diff;
  };

  // 1. Last session summary
  const last = sessions[0];
  if (last) {
    const parts = [];
    if (last.sport) parts.push(last.sport);
    if (last.distance_km) parts.push(`${last.distance_km.toFixed(1)} km`);
    if (last.duration_minutes) parts.push(fmtMin(last.duration_minutes));
    const extra = [];
    if (last.avg_hr) extra.push(`HR ${last.avg_hr}`);
    if (last.session_trimp) extra.push(`TRIMP ${Math.round(last.session_trimp)}`);
    updates.push({
      tone: "neutral",
      title: `Last session — ${fmtDate(last.date)}`,
      text: `${parts.join(" · ")}${extra.length ? ` (${extra.join(", ")})` : ""}.`,
    });
  }

  // 2. 7-day volume vs prior 7-day
  const last7 = sessions.filter((s) => { const d = daysAgo(s.date); return d >= 0 && d <= 7; });
  const prior7 = sessions.filter((s) => { const d = daysAgo(s.date); return d > 7 && d <= 14; });
  const last7Dur = last7.reduce((a, s) => a + (s.duration_minutes || 0), 0);
  const prior7Dur = prior7.reduce((a, s) => a + (s.duration_minutes || 0), 0);
  if (last7Dur > 0 || prior7Dur > 0) {
    const ratio = prior7Dur ? last7Dur / prior7Dur : null;
    let trend = "stable";
    if (ratio != null) {
      if (ratio >= 1.2) trend = "up";
      else if (ratio <= 0.8) trend = "down";
    }
    const line = ratio != null
      ? `${fmtMin(last7Dur)} over the last 7 days vs ${fmtMin(prior7Dur)} the week prior. `
      : `${fmtMin(last7Dur)} over the last 7 days. `;
    const note = trend === "up"
      ? "Volume is climbing — keep an eye on recovery."
      : trend === "down"
        ? "A lighter week — good for absorbing prior load."
        : "Load is steady week-over-week.";
    updates.push({
      tone: trend === "up" ? "warning" : trend === "down" ? "positive" : "neutral",
      title: "7-day training load",
      text: line + note,
    });
  }

  // 3. Form & fitness (CTL/ATL/TSB trend)
  const latestMetric = metrics[metrics.length - 1];
  const weekAgo = metrics.length > 7 ? metrics[metrics.length - 8] : null;
  if (latestMetric && typeof latestMetric.calculated_tsb === "number") {
    const tsbNow = latestMetric.calculated_tsb;
    let tone = "neutral";
    let msg = `Form is balanced (${sign(tsbNow)}) — productive training zone.`;
    if (tsbNow > 20) { tone = "positive"; msg = `Form is high (${sign(tsbNow)}) — you are primed for quality or racing.`; }
    else if (tsbNow < -15) { tone = "warning"; msg = `Form is negative (${tsbNow.toFixed(0)}) — accumulated fatigue; prioritize recovery.`; }
    let ctlNote = "";
    if (weekAgo && typeof latestMetric.calculated_ctl === "number" && typeof weekAgo.calculated_ctl === "number") {
      const d = latestMetric.calculated_ctl - weekAgo.calculated_ctl;
      if (Math.abs(d) >= 0.5) ctlNote = ` Fitness ${d >= 0 ? "up" : "down"} ${Math.abs(d).toFixed(1)} vs a week ago.`;
    }
    updates.push({ tone, title: "Form & fitness", text: msg + ctlNote });
  }

  // 4. Recovery trends (HRV / sleep / RHR from DailyMetrics)
  const rec = metrics.slice(-7);
  const prev = metrics.slice(-14, -7);
  const hrvNow = avg(rec.map((d) => d.hrv).filter((v) => typeof v === "number"));
  const hrvPrev = avg(prev.map((d) => d.hrv).filter((v) => typeof v === "number"));
  if (hrvNow != null && hrvPrev != null && hrvPrev > 0) {
    const pct = ((hrvNow - hrvPrev) / hrvPrev) * 100;
    const note = pct < -8
      ? " Autonomic recovery is trending down — consider an easier day."
      : pct > 8
        ? " Recovery trending up nicely."
        : " Stable.";
    updates.push({
      tone: pct < -8 ? "warning" : pct > 8 ? "positive" : "neutral",
      title: "HRV trend",
      text: `7-day HRV ${hrvNow.toFixed(0)}ms, ${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% vs the prior week.${note}`,
    });
  }
  const sleepNow = avg(rec.map((d) => d.sleep_score).filter((v) => typeof v === "number"));
  const sleepPrev = avg(prev.map((d) => d.sleep_score).filter((v) => typeof v === "number"));
  if (sleepNow != null && sleepPrev != null) {
    const d = sleepNow - sleepPrev;
    updates.push({
      tone: d < -5 ? "warning" : "neutral",
      title: "Sleep score",
      text: `7-day avg ${sleepNow.toFixed(0)} (${d >= 0 ? "+" : ""}${d.toFixed(0)} vs last week).`,
    });
  }
  const rhrNow = avg(rec.map((d) => d.resting_hr).filter((v) => typeof v === "number"));
  const rhrPrev = avg(prev.map((d) => d.resting_hr).filter((v) => typeof v === "number"));
  if (rhrNow != null && rhrPrev != null && Math.abs(rhrNow - rhrPrev) >= 2) {
    const d = rhrNow - rhrPrev;
    updates.push({
      tone: d > 0 ? "warning" : "positive",
      title: "Resting HR",
      text: `7-day avg ${rhrNow.toFixed(0)} bpm (${d >= 0 ? "+" : ""}${d.toFixed(0)} vs prior week). ${d > 0 ? "Rising RHR can signal accumulating fatigue." : "Improving — a good sign."}`,
    });
  }

  // 5. Consistency
  if (last7.length) {
    updates.push({
      tone: "neutral",
      title: "Consistency",
      text: `${last7.length} session${last7.length === 1 ? "" : "s"} logged in the last 7 days.`,
    });
  }

  return updates;
}