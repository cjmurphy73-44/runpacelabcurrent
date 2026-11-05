import React from "react";

const STEPS = ["About you", "Your baseline", "Devices"];

// Mobile-first progress rail: a filled bar shows how far along the athlete is,
// and the label names the current step so nobody wonders what's left.
export default function OnboardingProgress({ step = 0 }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground tabular-nums">Step {step + 1} of {STEPS.length}</span>
        <span className="font-medium">{STEPS[step]}</span>
      </div>
    </div>
  );
}