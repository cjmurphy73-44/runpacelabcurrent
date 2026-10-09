// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { termLabel } from "@/lib/terminology";
import { AuditBadge } from "@/components/ui/AuditBadge";

// GitHub-style compliance heatmap: daily executed vs. prescribed coach workouts
// over ~13 weeks. Cell fill = intensity zone of the prescribed session; an inner
// dot marks physiological strain severity (low/med/high from avg HR / max HR);
// missed prescribed days get a destructive outline; rest days are muted.

function localISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function cutoffISO(days) {
  return localISO(addDays(new Date(), -days));
}

function zoneNumber(zone) {
  if (!zone) return null;
  const n = parseInt(String(zone).replace(/[^0-9]/g, ""), 10);
  return n >= 1 && n <= 5 ? n : null;
}
function zoneFill(zone) {
  const n = zoneNumber(zone);
  if (n) return `hsl(var(--zone-${n}))`;
  return "hsl(var(--muted-foreground))";
}
function strainLevel(avgHr, maxHr) {
  if (!avgHr || !maxHr) return null;
  const r = avgHr / maxHr;
  if (r > 0.88) return "high";
  if (r > 0.75) return "med";
  return "low";
}

const STRAIN_DOT = {
  high: "bg-destructive",
  med: "bg-accent-amber",
  low: "bg-accent-emerald",
};

export default function ComplianceHeatmap({ athleteId, maxHr }) {
  const { lens } = useUIPreferences();
  const strainLabel = termLabel("strain", lens);
  const [prescribed, setPrescribed] = useState([]);
  const [executed, setExecuted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, e] = await Promise.all([
          base44.entities.TrainingPlanSession.filter(
            { athlete_id: athleteId, date: { $gte: cutoffISO(95) } },
            "date",
            1000
          ),
          base44.entities.WorkoutSession.filter(
            { athlete_id: athleteId, date: { $gte: cutoffISO(95) } },
            "date",
            1000
          ),
        ]);
        if (!active) return;
        setPrescribed(p || []);
        setExecuted(e || []);
      } catch {
        if (active) {
          setPrescribed([]);
          setExecuted([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [athleteId]);

  const weeks = useMemo(() => {
    const byDatePresc = {};
    prescribed.forEach((p) => {
      if (!p.date) return;
      byDatePresc[p.date] = p;
    });
    const byDateExec = {};
    executed.forEach((e) => {
      if (!e.date) return;
      byDateExec[e.date] = e;
    });

    // align to Monday, 13 weeks back
    const today = new Date();
    const thisMonday = addDays(today, -((today.getDay() + 6) % 7));
    const startMonday = addDays(thisMonday, -12 * 7);
    const cols = [];
    for (let w = 0; w < 13; w++) {
      const ws = addDays(startMonday, w * 7);
      const days = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(ws, d);
        const ds = localISO(date);
        const p = byDatePresc[ds];
        const e = byDateExec[ds];
        const isFuture = date > today;
        let cell;
        if (p) {
          const isRest = zoneNumber(p.prescribed_intensity_zone) === null && /rest/i.test(p.prescribed_intensity_zone || "");
          if (isRest) {
            cell = { ds, kind: "rest" };
          } else if (e) {
            cell = {
              ds,
              kind: "completed",
              zone: p.prescribed_intensity_zone,
              strain: strainLevel(e.avg_hr, maxHr),
            };
          } else if (isFuture) {
            cell = { ds, kind: "upcoming", zone: p.prescribed_intensity_zone };
          } else {
            cell = { ds, kind: "missed", zone: p.prescribed_intensity_zone };
          }
        } else if (e) {
          cell = {
            ds,
            kind: "extra",
            strain: strainLevel(e.avg_hr, maxHr),
            zone: e.sport === "running" ? "Z3" : null,
          };
        } else {
          cell = { ds, kind: "empty" };
        }
        days.push(cell);
      }
      cols.push({ label: localISO(ws).slice(5), days });
    }
    return cols;
  }, [prescribed, executed, maxHr]);

  const todayISO = localISO(new Date());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-heading flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" /> Compliance Matrix
          </CardTitle>
          <AuditBadge metric="strain" />
        </div>
        <CardDescription>
          Daily execution vs. prescribed sessions over 13 weeks. Fill = intensity zone;
          dot = {strainLabel.toLowerCase()}; red outline = missed prescribed session.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
            Loading compliance matrix…
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-2">
              {weeks.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-1.5">
                  <div className="text-[9px] text-muted-foreground h-3">{col.label}</div>
                  {col.days.map((cell) => {
                    const isToday = cell.ds === todayISO;
                    if (cell.kind === "empty") {
                      return (
                        <div
                          key={cell.ds}
                          title={`${cell.ds} · no session`}
                          className="w-3.5 h-3.5 rounded-sm border border-border bg-muted/40"
                        />
                      );
                    }
                    if (cell.kind === "rest") {
                      return (
                        <div
                          key={cell.ds}
                          title={`${cell.ds} · rest day`}
                          className={`w-3.5 h-3.5 rounded-sm border border-border bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground ${isToday ? "ring-1 ring-primary" : ""}`}
                        >
                          R
                        </div>
                      );
                    }
                    if (cell.kind === "upcoming") {
                      return (
                        <div
                          key={cell.ds}
                          title={`${cell.ds} · upcoming · ${cell.zone || ""}`}
                          className="w-3.5 h-3.5 rounded-sm border-2"
                          style={{ borderColor: zoneFill(cell.zone), background: "transparent" }}
                        />
                      );
                    }
                    if (cell.kind === "missed") {
                      return (
                        <div
                          key={cell.ds}
                          title={`${cell.ds} · missed · ${cell.zone || ""}`}
                          className="w-3.5 h-3.5 rounded-sm border-2 border-destructive bg-destructive/10"
                        />
                      );
                    }
                    // completed or extra
                    return (
                      <div
                        key={cell.ds}
                        title={`${cell.ds} · ${cell.kind} · ${cell.zone || ""} · strain ${cell.strain || "n/a"}`}
                        className={`w-3.5 h-3.5 rounded-sm border border-border relative ${isToday ? "ring-1 ring-primary" : ""}`}
                        style={{ background: cell.zone ? `${zoneFill(cell.zone)}` : "hsl(var(--accent))", opacity: cell.kind === "extra" ? 0.55 : 0.9 }}
                      >
                        {cell.strain && (
                          <span
                            className={`absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full ${STRAIN_DOT[cell.strain]}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 rounded-sm border border-border"
                    style={{ background: `hsl(var(--zone-${n}))`, opacity: 0.9 }}
                  />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Z{n}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border-2 border-destructive bg-destructive/10" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Missed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-border bg-muted flex items-center justify-center text-[8px] font-bold">R</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Rest</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">High strain</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}