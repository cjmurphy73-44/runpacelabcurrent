import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TILES = [
  { key: "sessions", label: "Sessions scanned" },
  { key: "recovered", label: "Streams recovered" },
  { key: "summary_only", label: "Summary retained" },
  { key: "failed", label: "Failed" },
];

export default function BackfillRunSummary({ totals, athletes }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {TILES.map((t) => (
          <Card key={t.key}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-2xl font-heading font-bold font-mono">
                {totals?.[t.key] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {athletes?.length > 0 && (
        <div className="rounded-md border border-[var(--obsidian-border)] divide-y divide-[var(--obsidian-border)]">
          {athletes.map((a) => (
            <div key={a.athlete_id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.recovered} recovered · {a.summary_only} summary
                </p>
              </div>
              {a.ctl !== undefined && a.ctl !== null && (
                <Badge variant="outline" className="font-mono text-[11px] shrink-0">
                  CTL {a.ctl} · ATL {a.atl} · TSB {a.tsb}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}