import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Sigma } from "lucide-react";
import { auditEntry } from "@/lib/auditRegistry";
import { useUIPreferences } from "@/context/UIPreferencesContext";

// Subtle clickable badge that opens a "Show your work" slide-over exposing the
// exact formula, citations, and raw input streams behind a metric.
// Usage: <AuditBadge metric="acwr" />
export function AuditBadge({ metric, className }) {
  const [open, setOpen] = useState(false);
  const entry = auditEntry(metric);
  const { lens } = useUIPreferences();
  if (!entry || lens === "simplified") return null;
  const badgeText = "Math";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        title="Show the math & sources"
        className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ${className || ""}`}
      >
        <Sigma className="w-3 h-3" />
        {badgeText}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{entry.title}</SheetTitle>
            <SheetDescription>{entry.summary}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Formula / model</div>
              <pre className="bg-muted rounded-md p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground">
                {entry.formula}
              </pre>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Input streams</div>
              <ul className="space-y-1">
                {entry.inputs.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Citations & standards</div>
              <p className="text-xs leading-relaxed whitespace-pre-line">{entry.citation}</p>
            </div>
            {entry.notes && (
              <div className="text-xs text-muted-foreground border-l-2 border-border pl-3">{entry.notes}</div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default AuditBadge;