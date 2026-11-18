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
  const [metric, setMetric] = useState("hr");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const verified = hasVerifiedStreams(workout);
  const windows = useMemo(
    () => verified ? recordingIntervals(workout, minutes * 60) : [],
    [workout, verified, minutes],
  );
  if (!verified || windows.length === 0) return null;
  const hrWindows = windows.filter(w => w.avgHr != null);
  const first = hrWindows[0], last = hrWindows[hrWindows.length - 1];
  const hrChange = first && last && first !== last ? last.avgHr - first.avgHr : null;

  const values = windows.map(w => metric === "hr" ? w.avgHr : w.avgSpeedKmh);
  const validValues = values.filter(v => Number.isFinite(v));
  const maxValue = validValues.length ? Math.max(...validValues) : 0;
  const activeIndex = selectedIndex !== null && selectedIndex < windows.length ? selectedIndex : null;
  const selectedWindow = activeIndex === null ? null : windows[activeIndex];
  const selectedValue = activeIndex === null ? null : values[activeIndex];

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
      <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h5 className="text-sm font-semibold">Interval trends</h5>
          <div role="group" aria-label="Chart measurement" className="inline-flex rounded-lg border border-border/60 p-1 gap-1">
            {[["hr", "Heart rate"], ["speed", "Speed"]].map(([key, label]) => (
              <button key={key} type="button" aria-pressed={metric === key}
                onClick={() => { setMetric(key); setSelectedIndex(null); }}
                className={`rounded-md px-3 py-2 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${metric === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Each bar represents one verified recording interval. Select a bar for its elapsed time and average. Gaps mean the measurement is unavailable, not zero.</p>
        {validValues.length === 0 ? (
          <p role="status" className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No verified {metric === "hr" ? "heart-rate" : "speed"} measurements are available for these intervals.</p>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="flex h-44 items-end gap-1.5" style={{ minWidth: Math.max(0, windows.length * 38) }} role="group" aria-label={metric === "hr" ? "Heart-rate interval chart" : "Speed interval chart"}>
              {windows.map((w, i) => {
                const value = values[i];
                const available = Number.isFinite(value);
                return (
                  <button key={w.index} type="button" disabled={!available}
                    onClick={() => setSelectedIndex(i)}
                    aria-label={`${clock(w.startSeconds)} to ${clock(w.startSeconds + w.durationSeconds)}: ${available ? `${value} ${metric === "hr" ? "bpm" : "km/h"}` : "measurement unavailable"}`}
                    aria-pressed={activeIndex === i}
                    className="group relative flex h-full min-w-8 flex-1 flex-col justify-end rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed">
                    <span className={`block w-full rounded-t-sm transition-colors ${!available ? "h-1 border-t-2 border-dashed border-muted-foreground/50" : activeIndex === i ? "bg-primary" : "bg-primary/55 group-hover:bg-primary/80"}`}
                      style={available ? { height: `${Math.max(5, maxValue > 0 ? value / maxValue * 100 : 5)}%` } : undefined} />
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>Start</span><span>Elapsed recording time →</span><span>End</span></div>
          </div>
        )}
        <div aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
          {selectedWindow && Number.isFinite(selectedValue)
            ? `${clock(selectedWindow.startSeconds)}–${clock(selectedWindow.startSeconds + selectedWindow.durationSeconds)} · ${selectedValue} ${metric === "hr" ? "bpm average" : "km/h average"}`
            : "Select a measured interval to inspect its average."}
        </div>
      </div>
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
