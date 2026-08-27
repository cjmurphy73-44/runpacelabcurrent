import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { adjustPaceForEnvironment, calculateDewPoint } from "@/math/environmental";
import { computeInjurySignal } from "@/lib/coachInjurySignal";

/**
 * useCoachingInsights — ENG-01
 * Aggregates the athlete's readiness score, location-based weather pace
 * adjustment, and coaching feedback into a daily-briefing payload for the
 * Intelligence Hub. Returns { data, loading, error }.
 *
 * data shape:
 *   readinessScore:        number | null
 *   readinessSource:       'logged' | 'synthesized' | null
 *   readinessExplanation:  string   (present when score is null)
 *   weatherAdvice:         string
 *   weatherConditions:     { tempC, dewPointC, rh, elevationM, pacePctSlowdown, adjustedPace } | null
 *   weatherError:          string | null
 *   coachingFeedback:      string | null
 */
export function useCoachingInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const athleteRef = useState({ current: null })[0];

  const loadWeather = useCallback(async (athlete) => {
    if (!("geolocation" in navigator)) {
      return {
        weatherAdvice: "Your browser doesn't support location access, so live weather can't be pulled automatically.",
        weatherConditions: null,
        weatherError: "Geolocation not supported.",
      };
    }

    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        enableHighAccuracy: false,
      });
    }).catch(() => null);

    if (!pos) {
      return {
        weatherAdvice: "Location access is needed for a live weather adjustment. Allow location for this page and retry.",
        weatherConditions: null,
        weatherError: "Location permission denied or unavailable.",
      };
    }

    const { latitude, longitude } = pos.coords;
    let openMeteo;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m&timezone=auto`;
      const res = await fetch(url);
      openMeteo = await res.json();
    } catch {
      return {
        weatherAdvice: "Couldn't reach the weather service right now. Try again in a moment.",
        weatherConditions: null,
        weatherError: "Weather fetch failed.",
      };
    }

    const tempC = openMeteo?.current?.temperature_2m;
    const rh = openMeteo?.current?.relative_humidity_2m;
    const elevationM = openMeteo?.elevation ?? 0;
    if (typeof tempC !== "number" || typeof rh !== "number") {
      return {
        weatherAdvice: "Weather data came back incomplete — try again shortly.",
        weatherConditions: null,
        weatherError: "Incomplete weather payload.",
      };
    }

    // Reference pace for the advice: easy run = ~25% slower than threshold pace.
    let targetPaceSecPerKm = 360; // 6:00/km fallback
    if (athlete.functional_threshold_pace_ms && athlete.functional_threshold_pace_ms > 0) {
      const thresholdSecPerKm = 1000 / athlete.functional_threshold_pace_ms;
      targetPaceSecPerKm = thresholdSecPerKm * 1.25;
    }

    const env = adjustPaceForEnvironment(targetPaceSecPerKm, {
      temperatureC: tempC,
      relativeHumidity: rh,
      altitudeMeters: elevationM,
    });

    const dewPointC = env.dewPointC;
    const pctSlowdown = Math.round((env.totalPaceMultiplier - 1) * 1000) / 10;

    let advice;
    if (pctSlowdown <= 0) {
      advice = `Conditions at your location are benign (${tempC.toFixed(0)}°C, ${rh.toFixed(0)}% RH, dew point ${dewPointC}°C) — no pace adjustment needed. Train at your planned easy pace of ${env.formattedAdjustedPace}.`;
    } else {
      advice = `Live conditions near you — ${tempC.toFixed(0)}°C, ${rh.toFixed(0)}% humidity, dew point ${dewPointC}°C — warrant slowing easy pace by ~${pctSlowdown}%. Target: ${env.formattedAdjustedPace} (${env.paceImpactSecondsPerKm >= 0 ? "+" : ""}${env.paceImpactSecondsPerKm}s/km vs. baseline).`;
    }

    return {
      weatherAdvice: advice,
      weatherConditions: {
        tempC: Math.round(tempC),
        dewPointC,
        rh: Math.round(rh),
        elevationM: Math.round(elevationM),
        pacePctSlowdown: pctSlowdown,
        adjustedPace: env.formattedAdjustedPace,
      },
      weatherError: null,
    };
  }, []);

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
        athleteRef.current = athlete;
        const todayKey = new Date().toISOString().split("T")[0];

        const [dailyMetrics, recentMessages] = await Promise.all([
          base44.entities.DailyMetrics.filter(
            { athlete_id: athlete.id, date: { $lte: todayKey } },
            "-date",
            1
          ),
          base44.entities.CoachMessage.filter({ athlete_id: athlete.id }, "-created_date", 30),
        ]);

        // --- Readiness ---
        let readinessScore = null;
        let readinessSource = null;
        let readinessExplanation = null;

        if (dailyMetrics.length) {
          const latest = dailyMetrics[0];
          if (typeof latest.readiness_score === "number" && latest.readiness_score > 0) {
            // Device-reported readiness (e.g. Whoop / Oura) is the gold standard.
            readinessScore = latest.readiness_score;
            readinessSource = "logged";
          } else {
            // Synthesize from component signals when a device score isn't present.
            const signals = [];
            const labels = [];
            if (typeof latest.hrv_score === "number" && latest.hrv_score > 0) {
              signals.push(latest.hrv_score);
              labels.push("HRV");
            } else if (typeof latest.hrv === "number" && latest.hrv > 0) {
              // Raw HRV in ms — normalize very roughly: most healthy 20–100ms.
              const norm = Math.max(0, Math.min(100, (latest.hrv - 10) / 0.9));
              signals.push(norm);
              labels.push("HRV");
            }
            if (typeof latest.sleep_score === "number" && latest.sleep_score > 0) {
              signals.push(latest.sleep_score);
              labels.push("sleep");
            }
            if (typeof latest.resting_hr === "number" && latest.resting_hr > 0) {
              const baseline = athlete.resting_hr || 60;
              const delta = latest.resting_hr - baseline;
              // Each bpm above baseline costs ~4 readiness points (positive delta = worse).
              const restComponent = Math.max(0, Math.min(100, 100 - delta * 4));
              signals.push(restComponent);
              labels.push("resting HR");
            }
            if (signals.length) {
              readinessScore = Math.round(signals.reduce((a, b) => a + b, 0) / signals.length);
              readinessSource = "synthesized";
            }
          }
        }

        if (readinessScore === null) {
          readinessExplanation =
            "No biometric data on file. The readiness score needs at least one daily signal — HRV, sleep score, or a resting heart-rate reading — which your wearable syncs into the Recovery Center (or you log manually there). Once that lands, today's score will compute automatically.";
        }

        // --- Weather (location-based) ---
        const weather = await loadWeather(athlete);

        // --- Coaching feedback ---
        const coachingFeedback = recentMessages.length ? recentMessages[0].content_text : null;

        // --- Coach injury / recovery signal (fed across every surface) ---
        const injurySignal = computeInjurySignal(recentMessages);

        if (!cancelled) {
          setData({
            readinessScore,
            readinessSource,
            readinessExplanation,
            coachingFeedback,
            injurySignal,
            ...weather,
          });
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
  }, [loadWeather]);

  const [weatherRefreshing, setWeatherRefreshing] = useState(false);

  const refetchWeather = useCallback(async () => {
    const athlete = athleteRef.current;
    if (!athlete) return;
    setWeatherRefreshing(true);
    try {
      const weather = await loadWeather(athlete);
      setData((prev) => (prev ? { ...prev, ...weather } : prev));
    } finally {
      setWeatherRefreshing(false);
    }
  }, [loadWeather]);

  return { data, loading, error, refetchWeather, weatherRefreshing };
}