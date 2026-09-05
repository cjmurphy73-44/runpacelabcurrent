import React, { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import PageShell from "@/components/layout/PageShell";
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
import { Plus, RefreshCw, KanbanSquare } from "lucide-react";

// Kanban board over TrainingPlanSession. Drag a card between the three columns
// to update its status; dropping into Completed stamps a fresh updated_date
// (built-in on the entity). Add-session dialog creates a prescribed session on
// the athlete's active plan.

const SPORTS = ["running", "cycling", "swimming", "strength", "triathlon", "other"];

const COLUMNS = [
  { id: "todo", title: "To Do", status: "pending", accent: "border-t-slate-400" },
  { id: "progress", title: "In Progress", status: "partial", accent: "border-t-amber-400" },
  { id: "done", title: "Completed", status: "completed", accent: "border-t-emerald-500" },
];

function statusColumn(status) {
  if (status === "pending") return "todo";
  if (status === "partial" || status === "modified") return "progress";
  return "done"; // completed, excess, skipped
}

function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function TrainingKanban() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState(null);
  const [plan, setPlan] = useState(null);
  const [sessions, setSessions] = useState([]);
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
      const list = await base44.entities.TrainingPlanSession.filter(
        { athlete_id: a.id },
        "-date",
        300
      );
      setSessions(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    const col = COLUMNS.find((c) => c.id === destination.droppableId);
    const session = sessions.find((s) => s.id === draggableId);
    if (!session || !col) return;
    const prevStatus = session.status;
    // optimistic
    setSessions((prev) =>
      prev.map((s) => (s.id === session.id ? { ...s, status: col.status } : s))
    );
    try {
      await base44.entities.TrainingPlanSession.update(session.id, {
        status: col.status,
      });
      if (col.status === "completed") {
        toast({
          title: "Marked completed",
          description: `${session.date} · timestamp updated.`,
        });
      }
    } catch (e) {
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, status: prevStatus } : s))
      );
      toast({ title: "Update failed", variant: "destructive" });
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

  const grouped = { todo: [], progress: [], done: [] };
  sessions.forEach((s) => grouped[statusColumn(s.status)].push(s));
  Object.values(grouped).forEach((arr) =>
    arr.sort((a, b) => (a.date || "").localeCompare(b.date || ""))
  );

  return (
    <PageShell
      title="Training Board"
      description="Drag sessions across columns. Moving to Completed stamps a new updated timestamp."
      icon={KanbanSquare}
      action={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={!plan}>
            <Plus className="w-4 h-4" />
            Add session
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
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`rounded-md border border-border border-t-4 ${col.accent} bg-muted/30 min-h-[200px] ${
                    snapshot.isDraggingOver ? "ring-2 ring-primary/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-sm font-semibold">{col.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {grouped[col.id].length}
                    </span>
                  </div>
                  <div className="p-2 space-y-2 min-h-[60px]">
                    {grouped[col.id].length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-6">
                        No sessions
                      </div>
                    )}
                    {grouped[col.id].map((s, idx) => (
                      <Draggable key={s.id} draggableId={s.id} index={idx}>
                        {(p, snap) => (
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            className={`rounded-md border border-border bg-card p-3 text-sm shadow-sm cursor-grab ${
                              snap.isDragging ? "ring-2 ring-primary" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium tabular-nums">{s.date}</span>
                              <span className="text-xs capitalize text-muted-foreground">
                                {s.sport}
                              </span>
                            </div>
                            {s.rationale_text && (
                              <div className="mt-1 font-medium">{s.rationale_text}</div>
                            )}
                            <div className="mt-1 text-xs text-muted-foreground">
                              {s.prescribed_duration_minutes
                                ? `${s.prescribed_duration_minutes} min`
                                : ""}
                              {s.prescribed_intensity_zone
                                ? ` · ${s.prescribed_intensity_zone}`
                                : ""}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

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