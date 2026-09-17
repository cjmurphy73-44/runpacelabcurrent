import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useFitness } from "@/context/FitnessContext";

const WINDOW_DAYS = 14;

const TONE_STYLES = {
  positive: "border-emerald-500/40 bg-emerald-50/60 text-emerald-900",
  neutral: "border-border bg-muted/40 text-foreground",
  warning: "border-amber-500/40 bg-amber-50/60 text-amber-900",
};
const TONE_LABEL = { positive: "Win", neutral: "Note", warning: "Watch" };

function withinDays(dateStr, days) {
  if (!dateStr) return false;
  const diff = (Date.now() - new Date(dateStr).getTime()) / 86400000;
  return diff >= -1 && diff <= days;
}

// Compress sessions/metrics into a small, LLM-friendly payload (only the last ~2 weeks).
function buildPayload(athlete, sessions, metrics) {
  const recentSessions = sessions
    .filter((s) => withinDays(s.date, WINDOW_DAYS))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .map((s) => ({
      date: s.date,
      sport: s.sport,
      distance_km: s.distance_km,
      duration_minutes: s.duration_minutes,
      avg_hr: s.avg_hr,
      session_trimp: s.session_trimp,
      session_tss: s.session_tss,
    }));

  const recentMetrics = metrics
    .filter((m) => withinDays(m.date, WINDOW_DAYS))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .map((m) => ({
      date: m.date,
      ctl: m.calculated_ctl,
      atl: m.calculated_atl,
      tsb: m.calculated_tsb,
      hrv: m.hrv,
      sleep_score: m.sleep_score,
      resting_hr: m.resting_hr,
      readiness_score: m.readiness_score,
    }));

  return {
    athlete_baselines: {
      vdot: athlete?.vdot_estimate,
      threshold_pace_ms: athlete?.functional_threshold_pace_ms,
      ftp_watts: athlete?.ftp_watts,
      max_hr: athlete?.max_heart_rate,
      resting_hr: athlete?.resting_hr,
      current_ctl: athlete?.current_ctl,
      current_atl: athlete?.current_atl,
      current_tsb: athlete?.current_tsb,
    },
    sessions_last_14d: recentSessions,
    metrics_last_14d: recentMetrics,
  };
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    assessment: {
      type: "string",
      description: "A 2–4 sentence coach-voiced assessment of what the athlete has been doing and how their performance/abilities are trending over the last couple of weeks.",
    },
    highlights: {
      type: "array",
      description: "3–5 concise takeaway bullets, each tagged with a tone.",
      items: {
        type: "object",
        properties: {
          tone: { type: "string", enum: ["positive", "neutral", "warning"] },
          title: { type: "string" },
          text: { type: "string" },
        },
        required: ["tone", "title", "text"],
      },
    },
  },
  required: ["assessment", "highlights"],
};

export default function CoachBriefing({ athlete }) {
  const { dailyMetrics, workoutSessions, loading } = useFitness();
  const [briefing, setBriefing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ranSignature = useRef("");

  const payload = useMemo(() => buildPayload(athlete, workoutSessions, dailyMetrics), [athlete, workoutSessions, dailyMetrics]);
  // A stable signature so we don't re-run the LLM on every render — only when the underlying data actually changes.
  const signature = useMemo(() => JSON.stringify(payload), [payload]);
  const hasData = payload.sessions_last_14d.length > 0 || payload.metrics_last_14d.length > 0;

  const generate = async (sig) => {
    setBusy(true);
    setError(null);
    try {
      const prompt = `You are an elite, plainspoken endurance coach giving the athlete a brief, honest read on their last couple of weeks.

Use ONLY the data below. Do not invent sessions or metrics that aren't present. If a signal is missing, say so briefly rather than guessing.

Write in second person ("you"), warm but direct, no hype. Avoid jargon — prefer plain language a motivated amateur understands.

Cover:
- What they've actually been doing (volume, consistency, sport mix) over the last ~14 days.
- How their performance / abilities are trending (fitness building, form, readiness, recovery signals) — trend direction, not just current values.
- One or two things to watch or adjust next.

Keep the assessment to 2–4 sentences. Then give 3–5 highlights as short bullets, each tagged positive / neutral / warning.

Athlete data (JSON):
${JSON.stringify(payload)}`;
      const response = await base44.functions.invoke('coachBriefing', { athlete_id: athlete?.id, prompt, response_json_schema: RESPONSE_SCHEMA });
      setBriefing(response.data.result);
      ranSignature.current = sig;
    } catch (e) {
      setError(e?.message || "Couldn't generate your briefing right now.");
    } finally {
      setBusy(false);
    }
  };

  // Auto-generate once when fitness data lands (and again only if the data materially changes).
  useEffect(() => {
    if (loading || busy) return;
    if (!hasData) return;
    if (signature === ranSignature.current) return;
    generate(signature);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasData, signature, busy]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-heading">Coach Briefing</CardTitle>
          <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border border-border text-muted-foreground">AI</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => generate(signature)}
          disabled={busy || loading || !hasData}
          title="Refresh briefing"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Reading your training data…</p>
        ) : !hasData ? (
          <p className="text-sm text-muted-foreground">
            Not enough recent data for a briefing yet — log a couple of sessions or sync a wearable and your coach's read on the last two weeks will appear here.
          </p>
        ) : busy && !briefing ? (
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
            <p className="text-xs text-muted-foreground pt-1">Your coach is reviewing the last couple of weeks…</p>
          </div>
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => generate(signature)} disabled={busy}>
              Try again
            </Button>
          </div>
        ) : briefing ? (
          <>
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{briefing.assessment}</ReactMarkdown>
            </div>
            {Array.isArray(briefing.highlights) && briefing.highlights.length > 0 && (
              <ul className="space-y-2">
                {briefing.highlights.map((h, i) => {
                  const tone = TONE_STYLES[h.tone] || TONE_STYLES.neutral;
                  return (
                    <li key={i} className={`flex gap-3 rounded-md border px-3 py-2 ${tone}`}>
                      <span className="text-[10px] uppercase tracking-wider font-semibold shrink-0 mt-0.5 opacity-80">
                        {TONE_LABEL[h.tone] || TONE_LABEL.neutral}
                      </span>
                      <span className="text-sm">
                        {h.title && <span className="font-medium">{h.title}: </span>}
                        {h.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}