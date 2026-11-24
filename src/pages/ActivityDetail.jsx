import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { downloadWorkoutFile } from "@/services/workoutExport";
import { useSubscription } from "@/hooks/useSubscription";
import RecordingIntervals from "@/components/workout/RecordingIntervals";
import CorosOriginalRecording from "@/components/workout/CorosOriginalRecording";
import FeatureGate from "@/components/billing/FeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageShell from "@/components/layout/PageShell";
import SectionHeading from "@/components/layout/SectionHeading";
import { ArrowLeft, Sparkles, Activity as ActivityIcon, Clock, MapPin, HeartPulse, Gauge, RotateCw, AlertCircle, Files, Layers, CalendarDays, Pencil, Check, X, Loader2, Download, TrendingDown } from "lucide-react";
import { workoutLoadPresentation } from "@/lib/workoutLoadPresentation";
import { aerobicDecouplingInterpretation, efficiencyFactorInterpretation } from "@/lib/workoutInterpretation";
import { AuditBadge } from "@/components/ui/AuditBadge";

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
  const rounded = Math.round(sec);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ActivityDetail() {
  const { id } = useParams();
  return <WorkoutActivity key={id} id={id} />;
}

function WorkoutActivity({ id }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [workout, setWorkout] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [assets, setAssets] = useState(null);
  const [assetError, setAssetError] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [insightError, setInsightError] = useState("");
  const [editingDate, setEditingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState("");
  const [patching, setPatching] = useState(false);
  const [patchMsg, setPatchMsg] = useState(null);
  const [planSession, setPlanSession] = useState(null);
  const { plan } = useSubscription();

  useEffect(() => {
    let active = true;
    let unsubscribe;
    setLoading(true);
    setLoadError(false);
    const ifActive = update => { if (active) update(); };
    base44.entities.WorkoutSession.get(id).then(workout => {
      if (!active) return;
      setWorkout(workout);
      setLoading(false);
      if (!workout) return;

      if (workout.training_plan_session_id) {
        base44.entities.TrainingPlanSession.get(workout.training_plan_session_id)
          .then(session => ifActive(() => setPlanSession(session)))
          .catch(() => {});
      }
      base44.entities.WorkoutFeedback.filter({ workout_id: id }, "-created_date", 1)
        .then(rows => ifActive(() => setFeedback(current => current ?? rows[0] ?? null)))
        .catch(() => ifActive(() => setInsightError("Saved coach insights could not be loaded.")))
        .finally(() => ifActive(() => setFeedbackLoading(false)));
      base44.entities.WorkoutAsset.filter({ session_id: id }, "uploaded_at", 50)
        .then(rows => ifActive(() => setAssets(rows)))
        .catch(() => ifActive(() => setAssetError(true)));

      try {
        unsubscribe = base44.entities.WorkoutFeedback.subscribe(event => {
          if (event?.data?.workout_id === id && (event.type === "create" || event.type === "update")) {
            ifActive(() => setFeedback(event.data));
          }
        });
      } catch { /* Live feedback is optional. */ }
    }).catch(error => ifActive(() => {
      const status = error?.response?.status ?? error?.status;
      setLoadError(status !== 404);
      setLoading(false);
    }));
    return () => {
      active = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [id, loadAttempt]);

  if (loading) return <div role="status" className="text-center py-20 text-muted-foreground">Loading activity…</div>;

  if (!workout) {
    return (
      <PageShell maxWidth="max-w-2xl">
        <Card>
          <CardContent className="pt-8 text-center space-y-3">
            <p className="text-muted-foreground">{loadError ? "Could not load this workout." : "This activity could not be found."}</p>
            {loadError && <Button onClick={() => setLoadAttempt(attempt => attempt + 1)}>Retry</Button>}
            <Button asChild variant="outline">
              <Link to="/workouts"><ArrowLeft className="w-4 h-4" /> Back to workouts</Link>
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
    setInsightError("");
    try {
      const { data } = await base44.functions.invoke("postWorkoutAIEvaluation", { workout_id: id, athlete_id: workout.athlete_id });
      if (data?.feedback?.workout_id === id) {
        setFeedback(data.feedback);
      } else {
        const rows = await base44.entities.WorkoutFeedback.filter({ workout_id: id }, "-created_date", 1);
        if (!rows[0]) throw new Error("No feedback received.");
        setFeedback(rows[0]);
      }
    } catch (e) {
      setInsightError("Could not generate insights. Try again.");
    } finally {
      setRetrying(false);
    }
  };

  const handlePatchDate = async () => {
    if (!workout || !dateDraft || patching) return;
    setPatching(true);
    setPatchMsg(null);
    try {
      const { data } = await base44.functions.invoke("editWorkoutSession", {
        workout_id: workout.id, action: "update", updates: { date: dateDraft },
      });
      if (!data?.workout) throw new Error("Workout update was not confirmed.");
      setWorkout(data.workout);
      setPatchMsg({ ok: true, text: "Date updated." });
      setEditingDate(false);
    } catch (e) {
      setPatchMsg({ ok: false, text: e?.response?.data?.error || "Could not update date." });
    } finally {
      setPatching(false);
    }
  };

  const load = workoutLoadPresentation(workout);
  const summary = [
    { icon: Clock, label: "Duration", value: workout.duration_minutes ? `${workout.duration_minutes} min` : "—" },
    { icon: MapPin, label: "Distance", value: workout.distance_km ? `${workout.distance_km} km` : "—" },
    { icon: HeartPulse, label: "Avg HR", value: workout.avg_hr ? `${workout.avg_hr} bpm` : "—" },
    { icon: Gauge, label: "Training load", value: load.amount, detail: load.amount === "Load unavailable" ? null : load.label },
  ];

  const title = workout.sport
    ? workout.sport.charAt(0).toUpperCase() + workout.sport.slice(1) + " session"
    : "Activity";

  const laps = Array.isArray(workout.laps) ? workout.laps : [];
  const sortedAssets = [...(Array.isArray(assets) ? assets : [])].sort((a, b) => (SOURCE_PRIORITY_UI[b.file_type] || 0) - (SOURCE_PRIORITY_UI[a.file_type] || 0) || (a.uploaded_at || "").localeCompare(b.uploaded_at || ""));

  return (
    <PageShell maxWidth="max-w-3xl">
      <div className="mb-2">
        <Link to="/workouts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Workouts
        </Link>
      </div>

      <section className="space-y-4">
        <SectionHeading
          title={title}
          description={`${workout.date || ""}${workout.source_format ? ` · ${workout.source_format.toUpperCase()}` : ""}`}
          icon={ActivityIcon}
          action={planSession ? (
            <FeatureGate feature="structured_export" plan={plan} compact>
              <Button size="sm" variant="outline" onClick={() => downloadWorkoutFile(planSession)} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export Workout
              </Button>
            </FeatureGate>
          ) : undefined}
        />
        <Card>
          <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {summary.map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <s.icon className="w-3.5 h-3.5" />{s.label}
                </div>
                <div className="text-lg font-heading font-semibold">{s.value}</div>
                {s.detail && <div className="text-xs text-muted-foreground">{s.detail}</div>}
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

      {(workout.efficiency_factor != null || workout.aerobic_decoupling != null) && (
        <section className="space-y-4">
          <SectionHeading
            title="Efficiency & decoupling"
            description="Aerobic efficiency and pace/HR drift for this session."
            icon={TrendingDown}
            action={<AuditBadge metric="decoupling" />}
          />
          <Card>
            <CardContent className="pt-6 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Efficiency Factor</div>
                <div className="text-lg font-heading font-semibold tabular-nums">
                  {workout.efficiency_factor != null ? Number(workout.efficiency_factor).toFixed(2) : "—"}
                </div>
                <p className="text-xs text-muted-foreground">{efficiencyFactorInterpretation(workout.efficiency_factor, workout.sport)}</p>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Aerobic Decoupling (Pa:HR)</div>
                <div className="text-lg font-heading font-semibold tabular-nums">
                  {workout.aerobic_decoupling != null ? `${Number(workout.aerobic_decoupling).toFixed(1)}%` : "—"}
                </div>
                <p className="text-xs text-muted-foreground">{aerobicDecouplingInterpretation(workout.aerobic_decoupling)}</p>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-4">
        <SectionHeading
          title="Attached files"
          description="Source files used for this workout."
          icon={Files}
        />
        <Card>
          <CardContent className="pt-6">
            {assetError ? (
              <p className="text-sm text-muted-foreground">Attached files could not be loaded.</p>
            ) : assets === null ? (
              <p role="status" className="text-sm text-muted-foreground">Loading attached files…</p>
            ) : sortedAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files attached to this workout.</p>
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

      {workout.source_provider === "coros" && workout.provider_activity_id
        ? <CorosOriginalRecording key={workout.id} workout={workout} />
        : <RecordingIntervals workout={workout} />}

      <section className="space-y-4">
        <SectionHeading
          title="AI post-workout insight"
          description="AI analysis of this workout and your available training data."
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
            {insightError && <p role="alert" className="text-sm text-destructive">{insightError}</p>}
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
            ) : feedbackLoading ? (
              <p role="status" className="text-sm text-muted-foreground">Checking for coach insights…</p>
            ) : (
              <Button size="sm" variant="outline" onClick={handleRetry} disabled={retrying}>
                {retrying ? "Generating insights…" : "Generate coach insights"}
              </Button>
            )}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}

const SOURCE_PRIORITY_UI = { fit: 4, tcx: 3, csv: 2, manual: 1 };