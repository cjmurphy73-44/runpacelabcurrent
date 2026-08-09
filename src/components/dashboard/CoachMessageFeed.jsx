import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useFitness } from "@/context/FitnessContext";
import { computeCoachBriefing } from "@/lib/coachBriefing";

const TONE = {
  positive: { Icon: CheckCircle2, color: "text-accent-emerald" },
  warning: { Icon: AlertTriangle, color: "text-accent-amber" },
  neutral: { Icon: Activity, color: "text-muted-foreground" },
};

export default function CoachMessageFeed({ messages = [] }) {
  const { workoutSessions, dailyMetrics } = useFitness();
  const briefing = useMemo(() => computeCoachBriefing(workoutSessions, dailyMetrics), [workoutSessions, dailyMetrics]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Coach updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {briefing.length === 0 && messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No analysis yet — coach updates appear once you log workouts and metrics.</p>
        ) : (
          <>
            <div className="space-y-3">
              {briefing.map((u, i) => {
                const { Icon, color } = TONE[u.tone] || TONE.neutral;
                return (
                  <div key={i} className="border-b border-border last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{u.title}</span>
                    </div>
                    <p className="text-sm">{u.text}</p>
                  </div>
                );
              })}
            </div>

            {messages.length > 0 && (
              <div className="space-y-3 pt-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI notes</span>
                {messages.map((m) => (
                  <div key={m.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                    <Badge variant="outline" className="capitalize mb-1">{m.message_type.replace(/_/g, " ")}</Badge>
                    <p className="text-sm whitespace-pre-wrap">{m.content_text}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}