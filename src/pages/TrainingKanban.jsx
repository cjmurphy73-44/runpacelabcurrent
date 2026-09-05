import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageShell from "@/components/layout/PageShell";
import SectionHeading from "@/components/layout/SectionHeading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, RefreshCw, KanbanSquare, ChevronLeft, ChevronRight, Check, X, CalendarDays } from "lucide-react";

// Hybrid Training Board:
//  - Week spine (Mon–Sun) with today highlighted; each day row shows the
//    prescribed session(s) plus the actual logged workout for that date.
//    Tap to Complete / Skip (no drag — fiddly on mobile).
//  - "Coming up" backlog of prescribed sessions beyond this week, with a
//    one-tap "→ This week" move.
// Status is read from the session's own status field (skipped ≠ done), not a
// column mapping.

const SPORTS = ["running", "cycling", "swimming", "strength", "triathlon", "other"];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_META = {
  pending: { label: "Planned", cls: "bg-slate-100 text-slate-600" },
  completed: { label: "Done", cls: "bg-emerald-100 text-emerald-700" },
  partial: { label: "Partial", cls: "bg-amber-100 text-amber-700" },
  excess: { label: "Excess", cls: "bg-orange-100 text-orange-700" },
  skipped: { label: "Skipped", cls: "bg-zinc-200 text-zinc-600" },
  modified: { label: "Modified", cls: "bg-blue-100 text-blue-700" },
};

function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function formatShort(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function todayLocalISO() {
  return localISO(new Date());
}
function parseISODate(iso) {
  return new Date(iso + "T00:00:00");
}

export default function TrainingKanban() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState(null);
  const [plan, setPlan] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [newS, setNewS] = useState({
    date: todayLocalISO(),
    sport: "running",
    duration: 30,
    intensity: "",
    title: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const profiles = await base44.entities.AthleteProfile.filter({
        created_by_id: user.id,
      });
      if (profiles.length === 0) {
        setLoading(false);
        return;
      }
      const a = profiles[0];
      setAthlete(a);
      const active = await base44.entities.TrainingPlan.filter(
        { athlete_id: a.id, status: "active" },
        "-start_date",
        1
      );
      setPlan(active[0] || null);
      const [sess, wks] = await Promise.all([
        base44.entities.TrainingPlanSession.filter({ athlete_id: a.id }, "date", 300),
        base44.entities.WorkoutSession.filter({ athlete_id: a.id }, "-date", 90),
      ]);
      setSessions(sess);
      setWorkouts(wks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const weekAnchor = addDays(startOfWeekMonday(new Date()), weekOffset * 7);
  const weekStart = localISO(weekAnchor);
  const weekEnd = localISO(addDays(weekAnchor, 6));
  const todayISO = todayLocalISO();
  const days = DAY_NAMES.map((name, i) => {
    const d = addDays(weekAnchor, i);
    const iso = localISO(d);
    return { name, date: d, iso, isToday: iso === todayISO };
  });

  // index executed workouts by date for the "actual" column
  const workoutsByDate = {};
  workouts.forEach((w) => {
    if (!w.date) return;
    workoutsByDate[w.date] = workoutsByDate[w.date] || [];
    workoutsByDate[w.date].push(w);
  });

  const mark = async (session, status) => {
    const prev = session.status;
    setSessions((arr) => arr.map((s) => (s.id === session.id ? { ...s, status } : s)));
    try {
      await base44.entities.TrainingPlanSession.update(session.id, { status });
      toast({
        title: status === "completed" ? "Marked done" : status === "skipped" ? "Skipped" : "Updated",
      });
    } catch (e) {
      setSessions((arr) => arr.map((s) => (s.id === session.id ? { ...s, status: prev } : s)));
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const moveToThisWeek = async (session) => {
    const prevDate = session.date;
    setSessions((arr) => arr.map((s) => (s.id === session.id ? { ...s, date: weekStart } : s)));
    try {
      await base44.entities.TrainingPlanSession.update(session.id, { date: weekStart });
      toast({ title: "Moved to this week", description: formatShort(weekAnchor) });
    } catch (e) {
      setSessions((arr) => arr.map((s) => (s.id === session.id ? { ...s, date: prevDate } : s)));
      toast({ title: "Move failed", variant: "destructive" });
    }
  };

  const addSession = async () => {
    setSaving(true);
    try {
      await base44.entities.TrainingPlanSession.create({
        training_plan_id: plan.id,
        athlete_id: athlete.id,
        date: newS.date,
        sport: newS.sport,
        prescribed_duration_minutes: Number(newS.duration) || 0,
        prescribed_intensity_zone: newS.intensity,
        rationale_text: newS.title,
        status: "pending",
      });
      setAddOpen(false);
      setNewS({ date: todayLocalISO(), sport: "running", duration: 30, intensity: "", title: "" });
      load();
    } catch (e) {
      toast({
        title: "Could not add session",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  }
  if (!athlete) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Set up your athlete profile on the Dashboard first.
      </div>
    );
  }

  const weekLabel = `${formatShort(weekAnchor)} – ${formatShort(addDays(weekAnchor, 6))}`;
  const backlog = sessions
    .filter((s) => s.status === "pending" && s.date > weekEnd)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .slice(0, 12);

  return (
    <PageShell
      title="Training Board"
      description="Your week at a glance — prescribed vs. what you actually did. Tap to complete or skip."
      icon={KanbanSquare}
      maxWidth="max-w-3xl"
      action={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={!plan}>
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      }
    >
      {!plan && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No active plan — generate one on the Plan page before adding sessions.
            Existing sessions still show below.
          </CardContent>
        </Card>
      )}

      {/* Week stepper */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums min-w-[150px] text-center">{weekLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        {weekOffset !== 0 && (
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
            Today
          </Button>
        )}
      </div>

      {/* Day rows */}
      <div className="space-y-2">
        {days.map((d) => {
          const daySessions = sessions.filter((s) => s.date === d.iso);
          const dayActual = workoutsByDate[d.iso] || [];
          return (
            <div
              key={d.iso}
              className={`rounded-lg border p-3 ${d.isToday ? "border-primary/60 bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground w-9">{d.name}</span>
                <span className="text-sm tabular-nums">{formatShort(d.date)}</span>
                {d.isToday && (
                  <span className="text-[10px] font-medium uppercase tracking-wider text-primary">Today</span>
                )}
              </div>

              {daySessions.length === 0 && dayActual.length === 0 && (
                <div className="text-xs text-muted-foreground py-2 pl-11">Rest day</div>
              )}

              {daySessions.map((s) => {
                const meta = STATUS_META[s.status] || STATUS_META.pending;
                const actual = dayActual.length > 0 ? dayActual[0] : null;
                return (
                  <div key={s.id} className="mt-2 rounded-md border border-border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.rationale_text || `${s.sport} session`}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {s.sport}
                      {s.prescribed_duration_minutes ? ` · ${s.prescribed_duration_minutes} min` : ""}
                      {s.prescribed_intensity_zone ? ` · ${s.prescribed_intensity_zone}` : ""}
                    </div>
                    {actual && (
                      <div className="text-xs text-emerald-600 mt-1">
                        ✓ Logged
                        {actual.distance_km ? ` · ${actual.distance_km} km` : ""}
                        {actual.duration_minutes ? ` · ${Math.round(actual.duration_minutes)} min` : ""}
                      </div>
                    )}
                    {s.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => mark(s, "completed")}>
                          <Check className="w-3.5 h-3.5" />
                          Complete
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => mark(s, "skipped")}>
                          <X className="w-3.5 h-3.5" />
                          Skip
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {daySessions.length === 0 && dayActual.length > 0 && (
                <div className="text-xs text-emerald-600 py-1 pl-11">
                  ✓ Logged
                  {dayActual[0].distance_km ? ` · ${dayActual[0].distance_km} km` : ""}
                  {dayActual[0].duration_minutes ? ` · ${Math.round(dayActual[0].duration_minutes)} min` : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Backlog */}
      {backlog.length > 0 && (
        <section className="space-y-3 mt-8">
          <SectionHeading
            title="Coming up"
            subtitle="Prescribed sessions beyond this week"
            icon={CalendarDays}
          />
          <div className="space-y-2">
            {backlog.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.rationale_text || `${s.sport} session`}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {formatShort(parseISODate(s.date))} · {s.sport}
                    {s.prescribed_duration_minutes ? ` · ${s.prescribed_duration_minutes} min` : ""}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => moveToThisWeek(s)} className="shrink-0 ml-2">
                  → This week
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add training session</DialogTitle>
            <DialogDescription>
              Schedules a new prescribed session on your active plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="k-title">Title</Label>
              <Input
                id="k-title"
                value={newS.title}
                onChange={(e) => setNewS({ ...newS, title: e.target.value })}
                placeholder="e.g. Long run"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="k-date">Date</Label>
                <Input
                  id="k-date"
                  type="date"
                  value={newS.date}
                  onChange={(e) => setNewS({ ...newS, date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sport</Label>
                <Select value={newS.sport} onValueChange={(v) => setNewS({ ...newS, sport: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORTS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="k-dur">Duration (min)</Label>
                <Input
                  id="k-dur"
                  type="number"
                  min={1}
                  value={newS.duration}
                  onChange={(e) => setNewS({ ...newS, duration: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="k-int">Intensity zone</Label>
                <Input
                  id="k-int"
                  value={newS.intensity}
                  onChange={(e) => setNewS({ ...newS, intensity: e.target.value })}
                  placeholder="e.g. Z2"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addSession} disabled={saving}>
              {saving ? "Saving…" : "Add session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}