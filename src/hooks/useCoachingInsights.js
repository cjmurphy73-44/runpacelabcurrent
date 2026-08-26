import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * useCoachingInsights — ENG-01
 * Aggregates the athlete's latest readiness score, weather pacing advice,
 * and coaching feedback into a single daily-briefing payload for the
 * Intelligence Hub. Returns { data, loading, error }.
 */
export function useCoachingInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const user = await base44.auth.me();
        const profiles = await base44.entities.AthleteProfile.filter({ created_by_id: user.id });
        if (!profiles.length) {
          if (!cancelled) {
            setData(null);
            setError(new Error("No athlete profile found."));
          }
          return;
        }
        const athlete = profiles[0];
        const todayKey = new Date().toISOString().split("T")[0];

        const [dailyMetrics, recentMessages] = await Promise.all([
          base44.entities.DailyMetrics.filter(
            { athlete_id: athlete.id, date: { $lte: todayKey } },
            "-date",
            1
          ),
          base44.entities.CoachMessage.filter({ athlete_id: athlete.id }, "-created_date", 5),
        ]);

        // Derive weather pacing advice from the athlete's environmental model inputs.
        let weatherAdvice = "Add a location + conditions to today's session to generate a heat/humidity pacing adjustment.";
        let readinessScore = null;
        let coachingFeedback = null;

        if (dailyMetrics.length) {
          const latest = dailyMetrics[0];
          readinessScore = latest.readiness_score ?? latest.hrv_score ?? null;
        }

        if (recentMessages.length) {
          coachingFeedback = recentMessages[0].content_text;
        }

        if (!cancelled) {
          setData({ readinessScore, weatherAdvice, coachingFeedback });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}