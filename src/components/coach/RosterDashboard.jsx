import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Users, CheckCircle2, AlertTriangle, Search, ArrowUpDown } from "lucide-react";

// Operational dashboard for the coach roster: KPI cards + searchable/sortable
// table + a side drawer to view & edit an assignment. Replaces the old static
// plan-assignment table in CoachWorkspace.

function lastWorkout(workouts) {
  if (!workouts?.length) return null;
  return [...workouts].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
}

const COLUMNS = [
  { key: "name", label: "Athlete" },
  { key: "date", label: "Last activity" },
  { key: "category", label: "Plan" },
  { key: "status", label: "Status" },
];

export default function RosterDashboard({ assignments, profiles, workouts, plans, onChanged }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    return assignments.map((a) => {
      const p = profiles[a.athlete_profile_id];
      const w = lastWorkout(workouts[a.athlete_profile_id]);
      const pl = plans[a.athlete_profile_id];
      return {
        assignment: a,
        name: a.athlete_name_snapshot || (p ? `${p.first_name} ${p.last_name}` : "Unknown"),
        date: w?.date ?? null,
        category: pl?.plan_title ?? null,
        planStatus: pl?.status ?? null,
        status: pl?.status === "active" ? "active" : "review",
      };
    });
  }, [assignments, profiles, workouts, plans]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let r = rows;
    if (q) {
      r = r.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          (x.category || "").toLowerCase().includes(q)
      );
    }
    r = r.filter((x) => {
      if (statusFilter === "active") return x.status === "active";
      if (statusFilter === "review") return x.status === "review";
      return true;
    });
    r = [...r].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [rows, query, statusFilter, sortKey, sortDir]);

  const total = rows.length;
  const active = rows.filter((r) => r.status === "active").length;
  const review = rows.filter((r) => r.status === "review").length;

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const openRow = (row) => {
    setSelected(row);
    setNotes(row.assignment.notes || "");
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await base44.entities.CoachAthleteAssignment.update(selected.assignment.id, {
        notes,
      });
      onChanged?.();
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  const kpis = [
    { label: "Total athletes", value: total, icon: Users, tone: "text-primary", filter: "all" },
    { label: "Active plan", value: active, icon: CheckCircle2, tone: "text-emerald-600", filter: "active" },
    { label: "Needs review", value: review, icon: AlertTriangle, tone: "text-amber-600", filter: "review" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <Card
            key={k.label}
            onClick={() => setStatusFilter(k.filter)}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              statusFilter === k.filter ? "ring-2 ring-primary/30 border-primary" : ""
            }`}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <k.icon className={`w-5 h-5 ${k.tone}`} />
              <div>
                <div className="text-2xl font-bold tabular-nums leading-none">{k.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search athletes or plans…"
              className="pl-9"
            />
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((c) => (
                    <TableHead key={c.key}>
                      <button
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {c.label}
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No athletes match.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow
                      key={r.assignment.id}
                      className="cursor-pointer"
                      onClick={() => openRow(r)}
                    >
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="tabular-nums">{r.date ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[180px]">
                        {r.category ?? "No plan"}
                      </TableCell>
                      <TableCell>
                        {r.status === "active" ? (
                          <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">Needs review</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>View and edit roster assignment details.</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-muted-foreground text-xs">Last activity</div>
                    <div className="tabular-nums">{selected.date ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Plan</div>
                    <div className="truncate">{selected.category ?? "No plan"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Plan status</div>
                    <div className="capitalize">{selected.planStatus ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Assignment</div>
                    <div className="capitalize">{selected.assignment.status}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Coach notes</label>
                  <Textarea
                    rows={5}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Focus areas, cautions…"
                  />
                </div>
              </div>
              <SheetFooter className="mt-6">
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
                <Button onClick={saveNotes} disabled={saving}>
                  {saving ? "Saving…" : "Save notes"}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}