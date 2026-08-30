import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageShell from "@/components/layout/PageShell";
import SectionHeading from "@/components/layout/SectionHeading";
import { ArrowLeft, Sparkles, Activity as ActivityIcon, Clock, MapPin, HeartPulse, Gauge, RotateCw, AlertCircle, Files, Layers, CalendarDays, Pencil, Check, X, Loader2 } from "lucide-react";

// Intensity → dynamic color tokens used across the insight card.
const INTENSITY_STYLES = {
  easy:      { label: "Easy",      chip: "bg-emerald-100 text-emerald-700 border-emerald-300", bar: "bg-emerald-500", ring: "border-l-emerald-500" },
  moderate:  { label: "Moderate",  chip: "bg-amber-100 text-amber-700 border-amber-300",     bar: "bg-amber-500",   ring: "border-l-amber-500" },
  hard:      { label: "Hard",      chip: "bg-orange-100 text-orange-700 border-orange-300", bar: "bg-orange-500",  ring: "border-l-orange-500" },
  very_hard: { label: "Very Hard", chip: "bg-rose-100 text-rose-700 border-rose-300",       bar: "bg-rose-500",    ring: "border-l-rose-500" },
};

const INTENSITY_BAR_WIDTH = { easy: 25, moderate: 55, hard: 80, very_hard: 100 };

// Quantum Polar file-type badges + parse-status pills.
const FILE_TYPE_STYLES = {
  fit: { label: "FIT", chip: "bg-primary/10 text-primary border-primary/30" },
  tcx: { label: "TCX", chip: "bg-teal-50 text-teal-700 border-teal-200" },
  csv: { label: "CSV", chip: "bg-slate-100 text-slate-600 border-slate-300" },
};
const STATUS_STYLES = {
  parsed: { label: "Parsed", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Failed",  pill: "bg-rose-50 text-rose-700 border-rose-200" },
  pending: { label: "Pending", pill: "bg-amber-50 text-amber-700 border-amber-200" },
};

function fmtOffset(sec) {
  if (sec == null || isNaN(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ActivityDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [assets, setAssets] = useState([]);
  const [retrying, setRetrying] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState("");
  const [patching, setPatching] = useState(false);
  const [patchMsg, setPatchMsg] = useState(null);

  useEffect(() => {
    let unsubscribe = null;
    (async () => {
      try {
        const w = await base44.entities.WorkoutSession.get(id);
        setWorkout(w);
        const rows = await base44.entities.WorkoutFeedback.filter({ workout_id: id }, "-created_date", 5);
        setFeedback(rows[0] || null);
        try {
          const a = await base44.entities.WorkoutAsset.filter({ session_id: id }, "uploaded_at", 50);
          setAssets(Array.isArray(a) ? a : []);
        } catch (e) { /* assets optional */ }
      } catch (e) {
        console.error("ActivityDetail load failed", e);
      } finally {
        setLoading(false);
      }
      try {
        unsubscribe = base44.entities.WorkoutFeedback.subscribe((event) => {
          if (event?.data?.workout_id === id && (event.type === "create" || event.type === "update")) {
            setFeedback(event.data);
          }
        });
      } catch (e) { /* subscribe optional */ }
    })();
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [id]);

  if (loading) return <div className="text-center py-20 text-muted-foreground">Loading activity…</div>;

  if (!workout) {
    return (
      <PageShell maxWidth="max-w-2xl">
        <Card>
          <CardContent className="pt-8 text-center space-y-3">
            <p className="text-muted-foreground">This activity could not be found.</p>
            <Button asChild variant="outline">
              <Link to="/"><ArrowLeft className="w-4 h-4" /> Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const style = feedback?.intensity ? INTENSITY_STYLES[feedback.intensity] : null;
  const isFailed = feedback?.status === "failed";

  const handleRetry = async () => {
    if (!workout?.athlete_id || retrying) return;
    setRetrying(true);
    try {
      await base44.functions.invoke("postWorkoutAIEvaluation", { workout_id: id, athlete_id: workout.athlete_id });
      const rows = await base44.entities.WorkoutFeedback.filter({ workout_id: id }, "-created_date", 5);
      setFeedback(rows[0] || null);
    } catch (e) {
      console.error("retry postWorkoutAIEvaluation failed", e);
    } finally {
      setRetrying(false);
    }
  };

  const handlePatchDate = async () => {
    if (!workout || !dateDraft || patching) return;
    setPatching(true);
    setPatchMsg(null);
    try {
      const updated = await base44.entities.WorkoutSession.update(workout.id, { date: dateDraft });
      setWorkout(updated);
      try { await base44.functions.invoke("recalculateCTLATLTSB", { athlete_id: workout.athlete_id }); } catch (e) { console.warn("recalc after date patch failed", e); }
      setPatchMsg({ ok: true, text: "Date updated — load metrics recalculated." });
      setEditingDate(false);
    } catch (e) {
      setPatchMsg({ ok: false, text: e?.response?.data?.error || "Could not update date." });
    } finally {
      setPatching(false);
    }
  };

  const summary = [
    { icon: Clock, label: "Duration", value: workout.duration_minutes ? `${workout.duration_minutes} min` : "—" },
    { icon: MapPin, label: "Distance", value: workout.distance_km ? `${workout.distance_km} km` : "—" },
    { icon: HeartPulse, label: "Avg HR", value: workout.avg_hr ? `${workout.avg_hr} bpm` : "—" },
    { icon: Gauge, label: "TRIMP", value: workout.session_trimp ? workout.session_trimp.toFixed(0) : "—" },
  ];

  const title = workout.sport
    ? workout.sport.charAt(0).toUpperCase() + workout.sport.slice(1) + " session"
    : "Activity";

  const laps = Array.isArray(workout.laps) ? workout.laps : [];
  const sortedAssets = [...assets].sort((a, b) => (SOURCE_PRIORITY_UI[b.file_type] || 0) - (SOURCE_PRIORITY_UI[a.file_type] || 0) || (a.uploaded_at || "").localeCompare(b.uploaded_at || ""));

  return (
    <PageShell maxWidth="max-w-3xl">
      <div className="mb-2">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
      </div>

      <section className="space-y-4">
        <SectionHeading
          title={title}
          description={`${workout.date || ""}${workout.source_format ? ` · ${workout.source_format.toUpperCase()}` : ""}`}
          icon={ActivityIcon}
        />
        <Card>
          <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {summary.map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <s.icon className="w-3.5 h-3.5" />{s.label}
                </div>
                <div className="text-lg font-heading font-semibold">{s.value}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="w-4 h-4" /> Session date
            </div>
            {editingDate ? (
              <>
                <Input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} className="w-auto" />
                <Button size="sm" onClick={handlePatchDate} disabled={patching || !dateDraft} className="gap-1.5">
                  {patching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingDate(false); setPatchMsg(null); }} className="gap-1.5">
                  <X className="w-3.5 h-3.5" /> Cancel
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm font-mono tabular-nums">{workout.date || "—"}</span>
                <Button size="sm" variant="outline" onClick={() => { setDateDraft(workout.date || ""); setEditingDate(true); }} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Correct date
                </Button>
              </>
            )}
            {patchMsg && (
              <span className={`text-xs ${patchMsg.ok ? "text-primary" : "text-destructive"}`}>{patchMsg.text}</span>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Attached files"
          description="Every raw source format bound to this session — streams and laps are reconciled under strict priority (FIT > TCX > CSV)."
          icon={Files}
        />
        <Card>
          <CardContent className="pt-6">
            {sortedAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No raw files are recorded for this session.</p>
            ) : (
              <ul className="divide-y divide-border">
                {sortedAssets.map((a) => {
                  const ft = FILE_TYPE_STYLES[a.file_type] || FILE_TYPE_STYLES.csv;
                  const st = STATUS_STYLES[a.parsing_status] || STATUS_STYLES.pending;
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                      <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded border text-[11px] font-mono font-semibold tracking-wide ${ft.chip}`}>
                        {ft.label}
                      </span>
                      <span className="font-mono text-sm text-foreground truncate max-w-[16rem]" title={a.file_name}>{a.file_name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{a.uploaded_at ? new Date(a.uploaded_at).toLocaleString() : "—"}</span>
                      <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${st.pill}`}>{st.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {laps.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            title="Lap splits"
            description="Reconciled lap segments unified from the bound assets."
            icon={Layers}
          />
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4 font-medium">#</th>
                      <th className="py-2 pr-4 font-medium">Start</th>
                      <th className="py-2 pr-4 font-medium">Duration</th>
                      <th className="py-2 pr-4 font-medium">Distance</th>
                      <th className="py-2 pr-4 font-medium">Avg HR</th>
                      <th className="py-2 pr-4 font-medium">Speed</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums">
                    {laps.map((l, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2 pr-4 text-muted-foreground">{(l.lap_index ?? i) + 1}</td>
                        <td className="py-2 pr-4">{fmtOffset(l.start_time_offset_s)}</td>
                        <td className="py-2 pr-4">{l.duration_s != null ? `${l.duration_s}s` : "—"}</td>
                        <td className="py-2 pr-4">{l.distance_km != null ? `${l.distance_km} km` : "—"}</td>
                        <td className="py-2 pr-4">{l.avg_hr ?? "—"}</td>
                        <td className="py-2 pr-4">{l.avg_speed != null ? `${l.avg_speed} m/s` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-4">
        <SectionHeading
          title="AI post-workout insight"
          description="Generated by your coach moments after this session landed."
          icon={Sparkles}
        />
        <Card className={`border-l-4 ${isFailed ? "border-l-rose-400" : style ? style.ring : "border-l-transparent"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Coach feedback</CardTitle>
            {isFailed ? (
              <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">Retry needed</Badge>
            ) : style ? (
              <Badge variant="outline" className={style.chip}>{style.label} intensity</Badge>
            ) : feedback ? (
              <Badge variant="outline">Pending</Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {style && !isFailed && (
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full ${style.bar} transition-all`}
                  style={{ width: `${INTENSITY_BAR_WIDTH[feedback.intensity]}%` }}
                />
              </div>
            )}
            {feedback ? (
              isFailed ? (
                <div className="space-y-3">
                  <p className="flex items-start gap-2 text-sm text-rose-600">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{feedback.feedback}</span>
                  </p>
                  <Button size="sm" variant="outline" onClick={handleRetry} disabled={retrying} className="gap-1.5">
                    <RotateCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
                    {retrying ? "Retrying…" : "Retry"}
                  </Button>
                </div>
              ) : (
              <>
                <p className="text-sm leading-relaxed">{feedback.feedback}</p>
                {Array.isArray(feedback.highlights) && feedback.highlights.length > 0 && (
                  <ul className="space-y-1.5">
                    {feedback.highlights.map((h, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full ${style ? style.bar : "bg-muted-foreground"}`} />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
              )
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 animate-pulse" />
                Your coach is analysing this session — insights will appear here automatically.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}

const SOURCE_PRIORITY_UI = { fit: 4, tcx: 3, csv: 2, manual: 1 };