// src/hooks/useAnomalyAlerts.ts
//
// Proactive coaching-cue + anomaly engine. Pulls training-load and recovery
// data exclusively through the service repository layer (useServices), then
// scans for the patterns a real coach would flag:
//   - high fatigue risk (TSB deeply negative)
//   - recovery dip (readiness/HRV falling sharply vs 7-day baseline)
//   - monotony (low training variety across the last week)
//   - acute load spike (ATL up sharply week-over-week)
//   - fresh form / positive momentum
// Returns a ranked list of alerts surfaced as a proactive banner on the
// dashboard rather than buried in an isolated text generator.

import { useEffect, useState } from "react";
import { useServices } from "@/services/providers/ServiceContext";

export type AlertSeverity = "danger" | "warning" | "positive";

export interface AnomalyAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  cue?: string; // actionable coaching cue
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function useAnomalyAlerts() {
  const { authService, athleteProfileRepo, dailyMetricsRepo, workoutSessionRepo } = useServices();
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const user = await authService.me();
        const profiles = await athleteProfileRepo.filter({ created_by_id: user.id });
        if (!profiles.length) {
          if (!cancelled) setAlerts([]);
          return;
        }
        const athlete = profiles[0];

        const [metrics, workouts] = await Promise.all([
          dailyMetricsRepo.filter({ athlete_id: athlete.id }, "-date", 30),
          workoutSessionRepo.filter({ athlete_id: athlete.id }, "-date", 21),
        ]);

        const out: AnomalyAlert[] = [];

        // --- Training load imbalance (TSB) ---
        const latestMetric = metrics[0];
        const tsb = latestMetric?.calculated_tsb ?? athlete.current_tsb;
        const ctl = latestMetric?.calculated_ctl ?? athlete.current_ctl;
        const atl = latestMetric?.calculated_atl ?? athlete.current_atl;
        if (typeof tsb === "number" && tsb < -20) {
          out.push({
            id: "fatigue-risk",
            severity: tsb < -30 ? "danger" : "warning",
            title: "Acute fatigue building",
            detail: `Your form (TSB) is ${Math.round(tsb)} — fatigue is outpacing fitness. Keep hard sessions short and prioritise recovery.`,
            cue: "Swap today's quality session for an easy or rest day unless you're tapering into a race.",
          });
        }

        // --- Recovery dip (readiness/HRV vs 7-day baseline) ---
        if (metrics.length >= 4) {
          const recent = metrics.slice(0, 7).filter((m: any) => typeof m.readiness_score === "number" && m.readiness_score > 0);
          if (recent.length >= 3) {
            const today = recent[0].readiness_score;
            const baseline = avg(recent.slice(1).map((m: any) => m.readiness_score));
            const dropPct = baseline > 0 ? ((baseline - today) / baseline) * 100 : 0;
            if (dropPct >= 15) {
              out.push({
                id: "recovery-dip",
                severity: dropPct >= 25 ? "danger" : "warning",
                title: "Recovery dipping",
                detail: `Today's readiness (${Math.round(today)}) is ${Math.round(dropPct)}% below your 7-day average (${Math.round(baseline)}).`,
                cue: "Consider a recovery day or zone-1 only; check sleep and life stress.",
              });
            }
          }
        }

        // --- HRV dip (independent of readiness score) ---
        if (metrics.length >= 4) {
          const hrvRecent = metrics.slice(0, 7).filter((m: any) => typeof m.hrv === "number" && m.hrv > 0);
          if (hrvRecent.length >= 3) {
            const todayHrv = hrvRecent[0].hrv;
            const hrvBase = avg(hrvRecent.slice(1).map((m: any) => m.hrv));
            const hrvDropPct = hrvBase > 0 ? ((hrvBase - todayHrv) / hrvBase) * 100 : 0;
            if (hrvDropPct >= 12) {
              out.push({
                id: "hrv-dip",
                severity: "warning",
                title: "HRV trending down",
                detail: `HRV (${todayHrv.toFixed(0)}ms) is ${Math.round(hrvDropPct)}% below your rolling baseline (${hrvBase.toFixed(0)}ms).`,
                cue: "Autonomic recovery is lagging — back off intensity today.",
              });
            }
          }
        }

        // --- Acute load spike (ATL up sharply) ---
        if (metrics.length >= 14) {
          const last7 = metrics.slice(0, 7).map((m: any) => m.calculated_atl).filter((n) => typeof n === "number");
          const prev7 = metrics.slice(7, 14).map((m: any) => m.calculated_atl).filter((n) => typeof n === "number");
          if (last7.length >= 4 && prev7.length >= 4) {
            const spike = ((avg(last7) - avg(prev7)) / (avg(prev7) || 1)) * 100;
            if (spike >= 30) {
              out.push({
                id: "load-spike",
                severity: "warning",
                title: "Training load spiking",
                detail: `Acute load is up ${Math.round(spike)}% versus last week. Rapid ramps raise injury risk.`,
                cue: "Cap further increases near 10%/week until fatigue settles.",
              });
            }
          }
        }

        // --- Monotony (low training variety) ---
        const last7Workouts = workouts.slice(0, 7);
        if (last7Workouts.length >= 5) {
          const sports = new Set(last7Workouts.map((w: any) => w.sport).filter(Boolean));
          const easyDays = last7Workouts.filter((w: any) => (w.session_trimp ?? 0) < 50 && (w.session_trimp ?? 0) > 0).length;
          if (sports.size <= 1 && easyDays === 0) {
            out.push({
              id: "monotony",
              severity: "warning",
              title: "Training monotony",
              detail: "The last week is all one sport at similar intensity — monotony blunts adaptation and raises injury risk.",
              cue: "Add a cross-training day or a clear easy/recovery run to vary the stimulus.",
            });
          }
        }

        // --- Fresh form (positive cue when TSB is positive but not stale) ---
        if (typeof tsb === "number" && tsb > 5 && tsb < 25 && typeof ctl === "number" && ctl > 30) {
          out.push({
            id: "fresh-form",
            severity: "positive",
            title: "You're race-ready",
            detail: `Form is positive (TSB +${Math.round(tsb)}) on a solid fitness base (CTL ${Math.round(ctl)}).`,
            cue: "A great window for a key session or a tune-up race.",
          });
        }

        // --- Empty-data guard ---
        if (!metrics.length && !workouts.length) {
          // No alerts — the dashboard empty state handles this.
        }

        if (!cancelled) setAlerts(out);
      } catch (err) {
        if (!cancelled) setAlerts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [authService, athleteProfileRepo, dailyMetricsRepo, workoutSessionRepo]);

  return { alerts, loading };
}