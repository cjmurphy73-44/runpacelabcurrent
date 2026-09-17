import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_META } from "@/components/guide/guideContent";
import { CheckCircle2, Clock, FileText, Settings2 } from "lucide-react";

// Renders one connectable provider from guideContent data.
export default function ProviderExportCard({ provider }) {
  const meta = STATUS_META[provider.status] || STATUS_META.soon;
  const isLive = provider.status === "live";
  return (
    <Card id={`provider-${provider.id}`} className="scroll-mt-24">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-base">{provider.name}</h3>
            <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isLive ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5" />}
            <span>{isLive ? "Automatic sync" : provider.type === "bridge" ? "On-device bridge" : "OAuth sync"}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{provider.blurb}</p>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Provides: <span className="text-foreground font-medium">{provider.formats}</span>
        </div>
        <ol className="space-y-2">
          {provider.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        {provider.manual && (
          <div className="rounded-md bg-muted/50 border border-border p-3 text-xs text-muted-foreground flex gap-2">
            <Settings2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            <span><span className="font-medium text-foreground">Manual fallback:</span> {provider.manual}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}