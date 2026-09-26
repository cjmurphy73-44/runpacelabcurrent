import React from "react";
import { Sparkles, RefreshCw, ShieldAlert, AlertTriangle, Lock, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useExceptionSynthesis } from "@/hooks/useExceptionSynthesis";

const SEV_STYLE = {
  danger: { icon: ShieldAlert, chip: "bg-destructive/10 text-destructive", label: "Alert" },
  warning: { icon: AlertTriangle, chip: "bg-amber-500/15 text-amber-700", label: "Watch" },
  positive: { icon: Sparkles, chip: "bg-emerald-500/15 text-emerald-700", label: "Win" },
};

const CONF_STYLE = {
  high: "text-emerald-600",
  medium: "text-amber-600",
  low: "text-destructive",
};

function timeAgo(iso) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// Dedicated AI Synthesis card. Surfaces the exception-based daily synthesis +
// top anomaly flags with severity color-coding, composite confidence, and a
// last-updated stamp. Rendered in the Recovery & Readiness dashboard section.
export default function AISynthesisCard({ athleteId }) {
  const { data, loading, error, gated, rateLimited, refresh } = useExceptionSynthesis(athleteId);

  const order = { danger: 0, warning: 1, positive: 2 };
  const anomalies = (data?.anomalies || []).slice().sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-heading">AI Synthesis</CardTitle>
          <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border border-border text-muted-foreground">
            Exception-based
          </span>
          {data?.confidence && !loading && !gated && (
            <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold ${CONF_STYLE[data.confidence] || ""}`}>
              <Gauge className="w-3 h-3" /> {data.confidence}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={refresh}
          disabled={loading || !athleteId}
          title="Refresh synthesis"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!athleteId ? (
          <p className="text-sm text-muted-foreground">No athlete profile loaded.</p>
        ) : loading ? (
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
            <p className="text-xs text-muted-foreground pt-1">Synthesizing your daily telemetry…</p>
          </div>
        ) : gated ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>AI synthesis is a Pro feature.</span>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/subscribe">Upgrade to Pro</Link>
            </Button>
          </div>
        ) : rateLimited ? (
          <p className="text-sm text-muted-foreground">You've reached today's AI synthesis limit — it resets tomorrow.</p>
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={refresh}>Try again</Button>
          </div>
        ) : data?.empty ? (
          <p className="text-sm text-muted-foreground">
            Not enough data for a synthesis yet — log a couple of sessions or sync a wearable and your daily exception-based insight will appear here.
          </p>
        ) : data ? (
          <>
            {data.synthesisText && (
              <p className="text-sm leading-relaxed text-foreground">{data.synthesisText}</p>
            )}
            {anomalies.length > 0 && (
              <div className="space-y-2 pt-1">
                {anomalies.slice(0, 4).map((a) => {
                  const s = SEV_STYLE[a.severity] || SEV_STYLE.warning;
                  const Icon = s.icon;
                  return (
                    <div key={a.id} className="flex gap-2.5 items-start">
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${s.chip.split(" ")[1] || ""}`} />
                      <div className="min-w-0">
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded mr-2 ${s.chip}`}>
                          {s.label}
                        </span>
                        <span className="text-sm font-medium">{a.title}</span>
                        <p className="text-sm text-muted-foreground">{a.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {data.asOf && (
              <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">Updated {timeAgo(data.asOf)}</p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}