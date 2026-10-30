import React from "react";

function fmtDuration(seconds) {
  const s = Math.round(Number(seconds) || 0);
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function fmtPace(durationS, distanceKm) {
  if (!durationS || !distanceKm) return "—";
  const perKm = durationS / distanceKm;
  const m = Math.floor(perKm / 60);
  const s = Math.round(perKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function fmtSpeed(mps) {
  if (!mps) return null;
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

// Split-by-split table from reconciled lap segments (FIT lap 19 / TCX <Lap>).
// Shows pace for running-style laps and speed when the device only recorded speed.
export default function WorkoutSplitsTable({ laps, sport }) {
  if (!Array.isArray(laps) || laps.length === 0) return null;
  const showSpeed = sport === "cycling";

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground">Splits</h4>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40 text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">#</th>
              <th className="px-2 py-1.5 text-right font-medium">Time</th>
              <th className="px-2 py-1.5 text-right font-medium">Dist</th>
              <th className="px-2 py-1.5 text-right font-medium">{showSpeed ? "Speed" : "Pace"}</th>
              <th className="px-2 py-1.5 text-right font-medium">HR</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {laps.map((lap, i) => {
              const speed = fmtSpeed(lap.avg_speed);
              return (
                <tr key={lap.lap_index ?? i} className="border-t border-border/40">
                  <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-1.5 text-right">{fmtDuration(lap.duration_s)}</td>
                  <td className="px-2 py-1.5 text-right">{lap.distance_km ? `${lap.distance_km.toFixed(2)} km` : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{showSpeed ? speed || "—" : fmtPace(lap.duration_s, lap.distance_km)}</td>
                  <td className="px-2 py-1.5 text-right">{lap.avg_hr ? `${lap.avg_hr}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}