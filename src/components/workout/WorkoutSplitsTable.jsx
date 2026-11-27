import React from "react";
import { splitMetric, splitMetricLabel, splitDistanceText, splitDurationText } from "@/lib/splitMetrics";

// Split-by-split table from reconciled lap segments (FIT lap 19 / TCX <Lap>).
// Shows pace for running-style laps and speed when the device only recorded speed.
export default function WorkoutSplitsTable({ laps, sport }) {
  if (!Array.isArray(laps) || laps.length === 0) return null;
  // Previously imported FIT laps may contain max_speed in avg_hr due to an old
  // field-id mapping. Never display those values as physiological measurements.
  const hasInvalidHr = laps.some((lap) => lap.avg_hr != null && (!Number.isFinite(Number(lap.avg_hr)) || Number(lap.avg_hr) > 255 || Number(lap.avg_hr) < 0));

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground">Splits</h4>
      <p className="text-xs text-muted-foreground">Lap averages use distance and elapsed time when available; recorded device speed is a fallback.</p>
      {hasInvalidHr && (
        <p role="status" className="text-xs text-warning">
          Some older FIT splits contain invalid heart-rate values. They are hidden; reprocess the original recording to rebuild these lap metrics.
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40 text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">#</th>
              <th className="px-2 py-1.5 text-right font-medium">Time</th>
              <th className="px-2 py-1.5 text-right font-medium">Dist</th>
              <th className="px-2 py-1.5 text-right font-medium">{splitMetricLabel(sport)}</th>
              <th className="px-2 py-1.5 text-right font-medium">HR</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {laps.map((lap, i) => {
              return (
                <tr key={lap.lap_index ?? i} className="border-t border-border/40">
                  <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-1.5 text-right">{splitDurationText(lap.duration_s)}</td>
                  <td className="px-2 py-1.5 text-right">{splitDistanceText(lap.distance_km)}</td>
                  <td className="px-2 py-1.5 text-right">{splitMetric(lap, sport).text}</td>
                  <td className="px-2 py-1.5 text-right">{Number.isFinite(Number(lap.avg_hr)) && Number(lap.avg_hr) > 0 && Number(lap.avg_hr) < 255 ? `${lap.avg_hr}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}