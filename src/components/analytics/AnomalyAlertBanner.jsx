import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ShieldAlert, AlertTriangle, CheckCircle2, Bed, Gauge } from "lucide-react";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { termLabel } from "@/lib/terminology";

// Dynamic anomaly banner: flags ACWR spikes (>1.5), sharp VDOT/efficiency drops,
// and consecutive high-strain sessions. Each alert offers a one-click action that
// creates a coach-suggested rest / load-reduction session directly on the Kanban
// board (TrainingPlanSession on the active plan).

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

function highIntensity(s, maxHr) {
  if (!s) return false;
  if (s.avg_hr && maxHr && s.avg_hr / maxHr > 0.85) return true;
  const z = parseInt(String(s.prescribed_intensity_zone || "").replace(/[^0-9]/g, ""), 10);
  return z >= 4;
}

export default function AnomalyAlertBanner({ athleteId, maxHr }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { lens } = useUIPreferences();
  const acwrLabel = termLabel("acwr", lens);
  const [sessions, setSessions] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, pl] = await Promise.all([
          base44.entities.WorkoutSession.filter(
            { athlete_id: athleteId, date: { $gte: cutoffISO(35) } },
            "date",
            1000
          ),
          base44.entities.TrainingPlan.filter(
            { athlete_id: athleteId, status: "active" },
            "-start_date",
            1
          ),
        ]);
        if (!active) return;
        setSessions(s || []);
        setPlan(pl[0] || null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [athleteId]);

  const alerts = useMemo(() => {
    const byDate = {};
    sessions.forEach((s) => {
      if (!s.date) return;
      byDate[s.date] = s;
    });

    // ACWR (acute 7 / chronic 28÷4)
    const sumLoad = (endDate, days) => {
      let total = 0;
      const end = new Date(endDate + "T00:00:00");
      for (let i = 0; i < days; i++) {
        const ds = localISO(addDays(end, -i));
        total += (byDate[ds]?.session_tss || byDate[ds]?.session_trimp || 0);
      }
      return total;
    };
    const today = localISO(new Date());
    const acute = sumLoad(today, 7);
    const chronic = sumLoad(today, 28) / 4;
    const acwr = chronic > 0 ? acute / chronic : 0;

    // efficiency trend: last 7d avg vs prior 30d avg (efficiency_factor)
    const efWindow = (startOff, endOff) => {
      const arr = [];
      const end = addDays(new Date(), endOff);
      const start = addDays(new Date(), startOff);
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const ds = localISO(d);
        if (byDate[ds]?.efficiency_factor) arr.push(byDate[ds].efficiency_factor);
      }
      return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    };
    const recentEf = efWindow(-7, 0);
    const priorEf = efWindow(-30, -8);
    const efDrop =
      recentEf && priorEf && priorEf > 0
        ? ((priorEf - recentEf) / priorEf) * 100
        : 0;

    // consecutive high-strain days up to today
    let consec = 0;
    for (let i = 0; i < 14; i++) {
      const ds = localISO(addDays(new Date(), -i));
      if (highIntensity(byDate[ds], maxHr)) consec++;
      else break;
    }

    const out = [];
    if (acwr > 1.5) {
      out.push({
        key: "acwr",
        severity: acwr > 1.8 ? "high" : "med",
        title: `${acwrLabel} spike — ${acwr.toFixed(2)}`,
        detail: "Acute load is well above your chronic base. Reduce volume this week.",
        actionLabel: "Suggest load reduction",
        actionKind: "load",
        icon: Gauge,
      });
    }
    if (efDrop >= 8) {
      out.push({
        key: "ef",
        severity: efDrop >= 15 ? "high" : "med",
        title: `Efficiency drop — −${efDrop.toFixed(0)}%`,
        detail: "Your run efficiency (NGP/HR) has fallen sharply over the last 7 days.",
        actionLabel: "Suggest rest day",
        actionKind: "rest",
        icon: AlertTriangle,
      });
    }
    if (consec >= 3) {
      out.push({
        key: "consec",
        severity: consec >= 5 ? "high" : "med",
        title: `${consec} high-strain days in a row`,
        detail: "Back-to-back hard sessions without recovery elevate injury risk.",
        actionLabel: "Suggest rest day",
        actionKind: "rest",
        icon: ShieldAlert,
      });
    }
    return out;
  }, [sessions, maxHr]);

  const applyAction = async (alert) => {
    if (!plan) {
      toast({
        title: "No active plan",
        description: "Generate a plan first to add sessions to the board.",
        variant: "destructive",
      });
      return;
    }
    setActing(alert.key);
    try {
      const today = localISO(new Date());
      if (alert.actionKind === "rest") {
        await base44.entities.TrainingPlanSession.create({
          training_plan_id: plan.id,
          athlete_id: athleteId,
          date: today,
          sport: "other",
          prescribed_duration_minutes: 0,
          prescribed_intensity_zone: "Rest",
          rationale_text: "Coach-suggested rest day — anomaly alert",
          status: "pending",
        });
      } else {
        await base44.entities.TrainingPlanSession.create({
          training_plan_id: plan.id,
          athlete_id: athleteId,
          date: today,
          sport: "running",
          prescribed_duration_minutes: 20,
          prescribed_intensity_zone: "Z1 Recovery",
          rationale_text: "Coach-suggested load reduction — ACWR spike",
          status: "pending",
        });
      }
      toast({ title: "Added to your board", description: "Open the Training Board to review." });
      navigate("/kanban");
    } catch (e) {
      toast({ title: "Could not add session", description: e?.message, variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Checking training anomalies…
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="py-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-800">No training anomalies detected</p>
            <p className="text-xs text-emerald-700/80">Your load, efficiency and recovery signals are within range.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((a) => {
        const tone =
          a.severity === "high"
            ? "border-destructive/40 bg-destructive/5"
            : "border-amber-300 bg-amber-50/60";
        const iconTone = a.severity === "high" ? "text-destructive" : "text-amber-600";
        return (
          <Card key={a.key} className={tone}>
            <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-3 flex-1">
                <a.icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconTone}`} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={a.actionKind === "rest" ? "default" : "outline"}
                onClick={() => applyAction(a)}
                disabled={!!acting}
              >
                {a.actionKind === "rest" ? <Bed className="w-4 h-4" /> : <Gauge className="w-4 h-4" />}
                {acting === a.key ? "Adding…" : a.actionLabel}
              </Button>
            </CardContent>
          </Card>
        );
      })}
      {!plan && (
        <p className="text-xs text-muted-foreground px-1">
          Tip: one-click suggestions need an active plan — generate one on the Plan page.
        </p>
      )}
    </div>
  );
}