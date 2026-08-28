import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export interface ReadinessDay {
  date: string; // YYYY-MM-DD
  score: number | null; // null when no biometric signal exists for that day
  status: "optimal" | "moderate" | "fatigued" | "no_data";
}

// Status follows the same bands the coaching engine reports elsewhere:
// >=75 optimal, 40-74 moderate, <40 fatigued.
const STATUS_BANDS: { min: number; status: ReadinessDay["status"] }[] = [
  { min: 75, status: "optimal" },
  { min: 40, status: "moderate" },
  { min: 0, status: "fatigued" },
];

/**
 * scoreFromMetric — mirrors the synthesis in useCoachingInsights. Prefers a
 * device-reported readiness_score; otherwise synthesizes from the component
 * signals (HRV score, raw HRV, sleep score, resting HR vs baseline) that wearables
 * sync into DailyMetrics. Returns null when no signal is present for the day.
 */
function scoreFromMetric(m: any, restingBaseline: number): number | null {
  if (typeof m?.readiness_score === "number" && m.readiness_score > 0) {
    return m.readiness_score;
  }
  const signals: number[] = [];
  if (typeof m?.hrv_score === "number" && m.hrv_score > 0) {
    signals.push(m.hrv_score);
  } else if (typeof m?.hrv === "number" && m.hrv > 0) {
    // Rough normalization of raw HRV (ms) into a 0-100 component.
    signals.push(Math.max(0, Math.min(100, (m.hrv - 10) / 0.9)));
  }
  if (typeof m?.sleep_score === "number" && m.sleep_score > 0) signals.push(m.sleep_score);
  if (typeof m?.resting_hr === "number" && m.resting_hr > 0) {
    const delta = m.resting_hr - restingBaseline;
    // Each bpm above baseline costs ~4 readiness points (higher resting HR = worse).
    signals.push(Math.max(0, Math.min(100, 100 - delta * 4)));
  }
  if (!signals.length) return null;
  return Math.round(signals.reduce((a, b) => a + b, 0) / signals.length);
}

function statusForScore(score: number): ReadinessDay["status"] {
  return STATUS_BANDS.find((b) => score >= b.min)?.status ?? "fatigued";
}

/**
 * useReadinessHistory — fetches the athlete's DailyMetrics for the trailing
 * `days` window and renders each day into a ReadinessDay (chronological, oldest
 * first). Throws into `error` on auth/profile failure; surfaces `loading`.
 */
export const useReadinessHistory = (days = 35) => {
  const [data, setData] = useState<ReadinessDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const user = await base44.auth.me();
        const profiles = await base44.entities.AthleteProfile.filter({ created_by_id: user.id });
        if (!profiles.length) {
          if (!cancelled) setData([]);
          return;
        }
        const athlete = profiles[0];
        const restingBaseline = athlete.resting_hr || 60;

        // Fetch a few extra records to hedge against timezone edge effects.
        const metrics = await base44.entities.DailyMetrics.filter(
          { athlete_id: athlete.id },
          "-date",
          days + 5
        );
        const byDate = new Map<string, any>();
        for (const m of metrics) if (m.date) byDate.set(m.date, m);

        const out: ReadinessDay[] = [];
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split("T")[0];
          const m = byDate.get(key);
          const score = m ? scoreFromMetric(m, restingBaseline) : null;
          out.push({
            date: key,
            score,
            status: score === null ? "no_data" : statusForScore(score),
          });
        }

        if (!cancelled) {
          setData(out);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return { data, loading, error };
};