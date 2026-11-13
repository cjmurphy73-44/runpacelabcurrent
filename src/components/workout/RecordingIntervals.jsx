import React, { useMemo, useState } from "react";
import { recordingIntervals } from "@/lib/recordingIntervals";
import { hasVerifiedStreams } from "@/lib/streamValidity";

function clock(seconds) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Device laps may be absent or corrupt; these windows come only from the
// separately verified stored sample stream. They never overwrite FIT lap records.
export default function RecordingIntervals({ workout }) {
  const [minutes, setMinutes] = useState(10);
  const verified = hasVerifiedStreams(workout);
  const windows = useMemo(
    () => verified ? recordingIntervals(workout, minutes * 60) : [],
    [workout, verified, minutes],
  );
  if (!verified || windows.length === 0) return null;
  const hrWindows = windows.filter(w => w.avgHr != null);
  const first = hrWindows[0], last = hrWindows[hrWindows.length - 1];
  const hrChange = first && last && first !== last ? last.avgHr - first.avgHr : null;

  return (
    <section className="space-y-3" aria-label="Recording time intervals">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Recording time intervals</h4>
        <label className="flex items-center gap-2 text-xs">
          Window
          <select aria-label="Recording interval window in minutes" value={minutes}
            onChange={e => setMinutes(Number(e.target.value))}
            className="rounded border border-border bg-background px-2 py-1.5">
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Derived from verified timestamped recording samples, not the device's lap markers.
        Missing measurement coverage stays unavailable; HR change is descriptive, not
        an aerobic-decoupling or fitness estimate.
      </p>
      {hrChange !== null && <p className="text-xs text-muted-foreground">
        Average HR, first to last covered window: {hrChange > 0 ? "+" : ""}{hrChange} bpm.
        Changes may reflect intensity, terrain, heat or recovery.
      </p>}
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40 text-muted-foreground">
            <tr>
              <th scope="col" className="px-2 py-2 text-left">Elapsed</th>
              <th scope="col" className="px-2 py-2 text-right">HR</th>
              <th scope="col" className="px-2 py-2 text-right">HR coverage</th>
              <th scope="col" className="px-2 py-2 text-right">Distance</th>
              <th scope="col" className="px-2 py-2 text-right">Avg speed</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {windows.map(w => (
              <tr key={w.index} className="border-t border-border/40">
                <td className="px-2 py-2 whitespace-nowrap">{clock(w.startSeconds)}–{clock(w.startSeconds + w.durationSeconds)}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">{w.avgHr === null ? "—" : `${w.avgHr} bpm`}</td>
                <td className="px-2 py-2 text-right">{Math.round(w.hrCoverage * 100)}%</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">{w.distanceKm === null ? "—" : `${w.distanceKm.toFixed(2)} km`}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">{w.avgSpeedKmh === null ? "—" : `${w.avgSpeedKmh.toFixed(1)} km/h`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
