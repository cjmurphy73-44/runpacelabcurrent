import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, UploadCloud, FileText, CheckCircle2, AlertTriangle, ChevronRight, X } from "lucide-react";
// Assuming you have a standard reconciliation modal
import WorkoutReconciliationModal from "@/components/WorkoutReconciliationModal";

// Mock parser for client-side processing
const parseWorkoutFile = async (file) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        name: file.name,
        date: new Date().toISOString(),
        duration: 3600,
        tss: 50,
      });
    }, 1000);
  });
};

export default function BulkWorkoutImport({ athleteId }) {
  const inputRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [activeItem, setActiveItem] = useState(null);

  async function processFile(file) {
    const id = Math.random().toString(36).substr(2, 9);
    setQueue((q) => [...q, { id, name: file.name, status: "parsing" }]);
    try {
      const parsed = await parseWorkoutFile(file);
      setQueue((q) => q.map((it) => (it.id === id ? { ...it, parsed, status: "ready" } : it)));
    } catch (e) {
      setQueue((q) => q.map((it) => (it.id === id ? { ...it, status: "error", error: e.message } : it)));
    }
  }

  function handleFiles(files) {
    Array.from(files || []).forEach(processFile);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Workout Importer</CardTitle>
          <CardDescription>Drag and drop .fit, .gpx, or .tcx files to reconcile against your training plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-accent/40 transition-colors p-8 flex flex-col items-center justify-center text-center gap-2 min-h-[150px]"
          >
            <UploadCloud className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop FIT, GPX, or TCX files</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".fit,.gpx,.tcx"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {queue.length > 0 && (
            <div className="space-y-1.5">
              {queue.map((it) => (
                <div key={it.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate flex-1">{it.name}</span>
                  {it.status === "parsing" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                  {it.status === "ready" && (
                    <button onClick={() => setActiveItem(it)} className="text-primary hover:underline">Review</button>
                  )}
                  {it.status === "error" && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activeItem && (
        <WorkoutReconciliationModal
          open
          workout={activeItem.parsed}
          onClose={() => setActiveItem(null)}
          onSaved={() => {
            setQueue(q => q.map(it => it.id === activeItem.id ? {...it, status: 'saved'} : it));
            setActiveItem(null);
          }}
        />
      )}
    </div>
  );
}
