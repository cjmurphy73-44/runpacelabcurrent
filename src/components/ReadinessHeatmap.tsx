import React from "react";
import { Gauge } from "lucide-react";
import { ReadinessDay } from "@/hooks/useReadinessHistory";

interface ReadinessHeatmapProps {
  data: ReadinessDay[];
  loading?: boolean;
}

// Quantum Polar status palette — hairline cells, subtle tinted fills, the app's
// shared semantic colors (emerald/amber/destructive) and a faint muted no-data cell.
const STATUS_STYLES: Record<ReadinessDay["status"], string> = {
  optimal: "bg-accent-emerald/15 border-accent-emerald/40 text-accent-emerald",
  moderate: "bg-accent-amber/15 border-accent-amber/40 text-amber-600",
  fatigued: "bg-destructive/10 border-destructive/30 text-destructive",
  no_data: "bg-muted border-border text-muted-foreground/40",
};

const STATUS_LABELS: { status: ReadinessDay["status"]; label: string }[] = [
  { status: "optimal", label: "Optimal" },
  { status: "moderate", label: "Moderate" },
  { status: "fatigued", label: "Fatigued" },
  { status: "no_data", label: "No data" },
];

export const ReadinessHeatmap: React.FC<ReadinessHeatmapProps> = ({ data, loading }) => {
  const scored = data.filter((d) => d.score !== null);
  const avg =
    scored.length > 0
      ? Math.round(scored.reduce((a, b) => a + (b.score as number), 0) / scored.length)
      : null;
  const last = [...data].reverse().find((d) => d.score !== null);

  return (
    <div className="rounded-md border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Readiness · last {data.length || 35} days
          </h3>
        </div>
        <div className="text-xs font-mono tabular-nums text-muted-foreground">
          avg <span className="text-foreground font-semibold">{avg !== null ? avg : "—"}</span>
          {last && (
            <span className="ml-3">
              now <span className="text-foreground font-semibold">{last.score}</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
            Loading readiness history…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1.5">
              {data.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date} · ${day.status}`}
                  className={`relative aspect-square rounded-sm border flex items-center justify-center ${STATUS_STYLES[day.status]}`}
                >
                  <span className="font-mono tabular-nums text-[10px] font-semibold">
                    {day.score !== null ? day.score : "–"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {STATUS_LABELS.map((s) => (
                <div key={s.status} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-sm border ${STATUS_STYLES[s.status]}`} />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};