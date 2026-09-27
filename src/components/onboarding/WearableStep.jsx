import React from "react";
import { Watch, Activity, CircleDot, Share2, Heart, Check } from "lucide-react";
import { WEARABLES } from "@/lib/wearableCatalog";
import { Label } from "@/components/ui/label";

const ICONS = { Watch, Activity, CircleDot, Share2, Heart };

function WearableIcon({ name, className = "" }) {
  const Ico = ICONS[name] ?? Watch;
  return <Ico className={className} />;
}

// Onboarding step: asks the athlete which wearables / tracking ecosystems they
// use so the dashboard can tailor sync instructions to their actual hardware.
// Multi-select chip grid — users pick whatever they actually own/use.
export default function WearableStep({ selected = [], onToggle }) {
  const toggle = (key) => {
    if (selected.includes(key)) onToggle(selected.filter((k) => k !== key));
    else onToggle([...selected, key]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Which wearables & tracking apps do you use?</Label>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Optional</span>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Pick everything you train with — we'll tailor your sync instructions to your stack. You can change this anytime in Settings. Skip if you're not sure.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {WEARABLES.map((w) => {
          const active = selected.includes(w.key);
          const soon = w.status === "coming_soon";
          return (
            <button
              key={w.key}
              type="button"
              onClick={() => toggle(w.key)}
              className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              {active && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="w-2.5 h-2.5" />
                </span>
              )}
              {soon && !active && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-500/15 px-1 py-0.5 rounded">Soon</span>
              )}
              <WearableIcon name={w.icon} className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium leading-tight">{w.label}</span>
              {soon && <span className="text-[10px] text-muted-foreground leading-tight">manual upload</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}