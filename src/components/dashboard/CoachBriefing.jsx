import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useFitness } from "@/context/FitnessContext";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useServices } from "@/services/providers/ServiceContext";

const WINDOW_DAYS = 14;

const TONE_STYLES = {
  positive: "border-success/40 bg-success/10 text-foreground",
  neutral: "border-border bg-muted/40 text-foreground",
  warning: "border-warning/40 bg-warning/10 text-foreground",
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
  const { functionGateway } = useServices();
  const { user } = useAuth();
  const { isPro, loading: planLoading } = useSubscription();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const payload = useMemo(() => buildPayload(athlete, workoutSessions, dailyMetrics), [athlete, workoutSessions, dailyMetrics]);
  const signature = useMemo(() => JSON.stringify(payload), [payload]);
  const hasData = payload.sessions_last_14d.length > 0 || payload.metrics_last_14d.length > 0;
  const entitled = isPro || user?.role === "admin";

  const { data: briefing, isFetching: busy, error, refetch } = useQuery({
    queryKey: ["coach-briefing", user?.id, athlete?.id, signature],
    enabled: false,
    retry: false,
    queryFn: async () => {
      const prompt = `You are an elite, plainspoken endurance coach giving the athlete a brief, honest read on their last couple of weeks.

Use ONLY the data below. Do not invent sessions or metrics that aren't present. If a signal is missing, say so briefly rather than guessing.

Write in second person ("you"), warm but direct, no hype. Avoid jargon, prefer plain language a motivated amateur understands.

Cover:
- What they've actually been doing (volume, consistency, sport mix) over the last ~14 days.
- How their performance / abilities are trending (fitness building, form, readiness, recovery signals), trend direction, not just current values.
- One or two things to watch or adjust next.

Keep the assessment to 2–4 sentences. Then give 3–5 highlights as short bullets, each tagged positive / neutral / warning.

Athlete data (JSON):
${signature}`;
      const response = await functionGateway.invoke('coachBriefing', { athlete_id: athlete?.id, prompt, response_json_schema: RESPONSE_SCHEMA });
      if (!response.data?.result?.assessment) throw new Error("Briefing was not returned");
      return response.data.result;
    },
  });

  const generate = () => {
    if (entitled && athlete?.id && hasData && !busy) void refetch({ cancelRefetch: false });
  };
  const errorStatus = error?.response?.status ?? error?.status;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
          <CardTitle className="text-sm font-heading">AI briefing</CardTitle>
        </div>
        {entitled && briefing && (
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={generate}
            disabled={busy || loading || !hasData} aria-label="Refresh briefing">
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {planLoading ? (
          <p className="text-sm text-muted-foreground">Checking your plan…</p>
        ) : !entitled ? (
          <p className="text-sm text-muted-foreground">AI briefings are included with Pro.</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Reading your training data…</p>
        ) : !hasData ? (
          <p className="text-sm text-muted-foreground">Log or sync workouts to get a review of your last two weeks.</p>
        ) : busy && !briefing ? (
          <p role="status" className="text-sm text-muted-foreground">Reviewing your last two weeks…</p>
        ) : error ? (
          <div className="space-y-2">
            <p role="status" className="text-sm text-destructive">
              {errorStatus === 429 ? "You’ve reached the briefing limit. Try again later." : "Couldn’t generate your briefing."}
            </p>
            <Button variant="outline" size="sm" className="min-h-11" onClick={generate} disabled={busy}>
              Try again
            </Button>
          </div>
        ) : briefing ? (
          <>
            <div className={`prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed ${detailsOpen ? "" : "line-clamp-3"}`}>
              <ReactMarkdown>{briefing.assessment}</ReactMarkdown>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 w-full justify-center gap-2 sm:w-auto"
              aria-expanded={detailsOpen}
              aria-controls="coach-briefing-details"
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {detailsOpen ? "Show less" : "Read full briefing"}
              {detailsOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
            </Button>
            <div id="coach-briefing-details" hidden={!detailsOpen}>
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
            </div>
          </>
        ) : (
          <Button variant="outline" size="sm" className="min-h-11" onClick={generate}>Generate briefing</Button>
        )}
      </CardContent>
    </Card>
  );
}
