import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus } from "lucide-react";

export default function AddAthleteDialog({ open, onClose, profiles = [], existingIds = [], onAdd }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = profiles.filter((p) => !existingIds.includes(p.id));
    if (!q) return pool;
    return pool.filter((p) => `${p.first_name ?? ""} ${p.last_name ?? ""}`.toLowerCase().includes(q));
  }, [query, profiles, existingIds]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add athlete to roster</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search athletes by name…" className="pl-9" />
        </div>
        <ScrollArea className="h-64 pr-2 -mr-2">
          <div className="space-y-1">
            {filtered.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No athletes found.</p>}
            {filtered.map((p) => (
              <button key={p.id} onClick={() => onAdd(p)} className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                  {`${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-muted-foreground">VDOT {p.vdot_estimate ?? "—"} · {p.training_tier_preference ?? "—"}</p>
                </div>
                <UserPlus className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}