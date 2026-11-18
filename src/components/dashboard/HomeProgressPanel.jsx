import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/** Fixture-friendly, read-only activity trend. Does not derive physiological load. */
export function summarizeActivityProgress(workouts = [], today = new Date(), days = 7) {
  const end = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const buckets = Array.from({ length: days }, (_, i) => {
    const date = new Date(end - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
    return { date, minutes: 0, sessions: 0 };
  });
  const byDate = new Map(buckets.map(bucket => [bucket.date, bucket]));
  let missingDuration = 0;
  for (const workout of Array.isArray(workouts) ? workouts : []) {
    // Date-only records are calendar dates; timestamps represent instants.
    // Convert instants to the browser-local day before bucketing.
    const rawDate = workout?.date;
    let key = "";
    if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      key = rawDate;
    } else if (typeof rawDate === "string" && /(?:Z|[+-]\d{2}:?\d{2})$/.test(rawDate)) {
      const instant = new Date(rawDate);
      if (Number.isFinite(instant.getTime())) {
        const y = instant.getFullYear();
        const m = String(instant.getMonth() + 1).padStart(2, "0");
        const d = String(instant.getDate()).padStart(2, "0");
        key = y + "-" + m + "-" + d;
      }
    }
    const bucket = byDate.get(key);
    if (!bucket || !/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    bucket.sessions++;
    const minutes = workout.duration_minutes;
    if (typeof minutes === "number" && Number.isFinite(minutes) && minutes >= 0) bucket.minutes += minutes;
    else missingDuration++;
  }
  return {
    buckets,
    sessions: buckets.reduce((sum, bucket) => sum + bucket.sessions, 0),
    minutes: buckets.reduce((sum, bucket) => sum + bucket.minutes, 0),
    missingDuration,
  };
}

export default function HomeProgressPanel({ workouts = [], today = new Date(), historyLimited = false }) {
  const [days, setDays] = useState(7);
  const data = useMemo(() => summarizeActivityProgress(workouts, today, days), [workouts, today, days]);
  const peak = Math.max(1, ...data.buckets.map(bucket => bucket.minutes));
  return (
    <section aria-labelledby="home-progress-heading" className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Training history</p>
          <h2 id="home-progress-heading" className="text-xl font-heading font-semibold">Your recent activity</h2>
          <p className="text-sm text-muted-foreground">Saved session duration by local calendar date, not fitness or training load.</p>
        </div>
        <div role="group" aria-label="Activity history range" className="inline-flex rounded-lg border border-border p-1">
          {[7, 28].map(value => (
            <button key={value} type="button" aria-pressed={days === value}
              onClick={() => setDays(value)}
              className={`min-h-11 rounded-md px-3 text-sm font-medium ${days === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              {value} days
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Recorded sessions</p><p className="text-2xl font-semibold tabular-nums">{data.sessions}</p></div>
        <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Known duration</p><p className="text-2xl font-semibold tabular-nums">{Math.round(data.minutes)} <span className="text-sm font-normal">min</span></p></div>
      </div>
      {historyLimited && <p role="note" className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Showing available recent workout records only. Older sessions may be missing from this comparison.</p>}
      {data.sessions ? (
        <>
          <div role="img" aria-label={`Daily recorded duration over ${days} days. ${data.sessions} sessions, ${Math.round(data.minutes)} known minutes.`}
            className="flex h-36 items-end gap-1 border-b border-border" >
            {data.buckets.map(bucket => (
              <div key={bucket.date} className="flex-1 min-w-0 flex items-end h-full" title={`${bucket.date}: ${Math.round(bucket.minutes)} min, ${bucket.sessions} sessions`}>
                <div className="w-full rounded-t-sm bg-primary/75" style={{ height: `${bucket.minutes ? Math.max(3, bucket.minutes / peak * 100) : 0}%` }} />
              </div>
            ))}
          </div>
          {data.missingDuration > 0 && <p role="note" className="text-xs text-muted-foreground">{data.missingDuration} session{data.missingDuration === 1 ? "" : "s"} without usable duration excluded from minutes.</p>}
          <p className="text-xs text-muted-foreground">Bars show saved minutes per local calendar day. No readiness or performance inference.</p>
          <details className="rounded-lg border border-border p-3">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">View daily activity breakdown</summary>
            <div className="mt-2 max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Daily recorded sessions and known duration for the selected {days}-day period</caption>
                <thead><tr className="border-b border-border"><th scope="col" className="py-2">Date (local)</th><th scope="col" className="py-2 text-right">Sessions</th><th scope="col" className="py-2 text-right">Known minutes</th></tr></thead>
                <tbody>{data.buckets.map(bucket => (
                  <tr key={bucket.date} className="border-b border-border/50">
                    <th scope="row" className="py-2 font-normal tabular-nums">{bucket.date}</th>
                    <td className="py-2 text-right tabular-nums">{bucket.sessions}</td>
                    <td className="py-2 text-right tabular-nums">{Math.round(bucket.minutes)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </details>
        </>
      ) : <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">No saved sessions in this period. Connect a watch or import a workout to begin your history.</p>}
      <Link to="/workouts" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">Review all workouts →</Link>
    </section>
  );
}
