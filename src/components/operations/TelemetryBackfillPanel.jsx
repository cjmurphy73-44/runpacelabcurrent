import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import BackfillRunSummary from "./BackfillRunSummary";
import { DatabaseZap, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const MAX_CHUNKS_PER_ATHLETE = 40;

const EMPTY_TOTALS = { sessions: 0, recovered: 0, summary_only: 0, failed: 0 };

export default function TelemetryBackfillPanel() {
  const [phase, setPhase] = useState("idle"); // idle | scanning | ready | running | done
  const [preview, setPreview] = useState(null);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [athletes, setAthletes] = useState([]);
  const [progress, setProgress] = useState({ index: 0, total: 0, current: "" });
  const [error, setError] = useState(null);

  const scan = async () => {
    setPhase("scanning");
    setError(null);
    setTotals(EMPTY_TOTALS);
    setAthletes([]);
    try {
      const res = await base44.functions.invoke("backfillTelemetry", { action: "preview" });
      setPreview(res.data || res);
      setPhase("ready");
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not scan the workout library.");
      setPhase("idle");
    }
  };

  const run = async () => {
    if (!preview?.athletes?.length) return;
    setPhase("running");
    setError(null);
    const running = { ...EMPTY_TOTALS };
    const perAthlete = [];

    try {
      for (let i = 0; i < preview.athletes.length; i++) {
        const a = preview.athletes[i];
        if (!a.candidates) continue;
        setProgress({ index: i + 1, total: preview.athletes.length, current: a.name });

        let hasMore = true;
        let guard = 0;
        let cursor = null;
        const row = { athlete_id: a.athlete_id, name: a.name, recovered: 0, summary_only: 0 };

        while (hasMore && guard < MAX_CHUNKS_PER_ATHLETE) {
          const res = await base44.functions.invoke("backfillTelemetry", {
            action: "run",
            athlete_id: a.athlete_id,
            cursor,
          });
          const d = res.data || res;
          cursor = d.next_cursor || cursor;
          running.sessions += d.sessions_scanned || 0;
          running.recovered += d.streams_recovered || 0;
          running.summary_only += d.summary_only || 0;
          running.failed += d.failed || 0;
          row.recovered += d.streams_recovered || 0;
          row.summary_only += d.summary_only || 0;
          if (d.recalculated) {
            row.ctl = d.recalculated.ctl;
            row.atl = d.recalculated.atl;
            row.tsb = d.recalculated.tsb;
          }
          setTotals({ ...running });
          hasMore = Boolean(d.has_more);
          guard++;
        }
        perAthlete.push(row);
        setAthletes([...perAthlete]);
      }
      setPhase("done");
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "The backfill stopped before finishing.");
      setPhase("done");
    }
  };

  const pct = progress.total ? Math.round((progress.index / progress.total) * 100) : 0;
  const candidates = preview?.totals?.candidates || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <DatabaseZap className="w-4 h-4" /> Telemetry backfill
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Re-parses saved FIT, TCX and CSV files for sessions that only carry a summary,
          refetches from Garmin when no file is stored, then recalculates CTL, ATL and TSB
          for the athletes whose records changed.
        </p>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {preview && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{candidates} sessions need high-fidelity data</Badge>
            <Badge variant="outline">{preview.totals?.with_file || 0} have a stored file</Badge>
            <Badge variant="outline">{preview.athletes?.length || 0} athletes</Badge>
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate">
                {progress.current ? `Reprocessing ${progress.current}` : "Starting"}
              </span>
              <span className="font-mono">{pct}%</span>
            </div>
            <Progress value={pct} />
          </div>
        )}

        {phase === "done" && <BackfillRunSummary totals={totals} athletes={athletes} />}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={scan}
            disabled={phase === "scanning" || phase === "running"}
          >
            {phase === "scanning" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {preview ? "Rescan library" : "Scan library"}
          </Button>
          <Button
            size="sm"
            onClick={run}
            disabled={!candidates || phase === "running" || phase === "scanning"}
          >
            {phase === "running" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : phase === "done" ? (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            ) : null}
            {phase === "done" ? "Run again" : "Run backfill"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}