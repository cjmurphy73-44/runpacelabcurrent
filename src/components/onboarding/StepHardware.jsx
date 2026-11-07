import React from "react";
import { Watch } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import WearableStep from "@/components/onboarding/WearableStep";
import { TIER_OPTIONS, TIER_EXPLAINER } from "@/lib/trainingTiers";
import { ONBOARDING_COPY } from "../../constants/onboardingCopy";

// Plain-language meaning of each tier, shown BEFORE the τ maths so the
// choice is made on how it feels, not on jargon.
const TIER_PLAIN = {
  conservative: "The gentlest ramp. Fatigue clears quickly and your form barely swings — best if you're injury-prone or coming back from a break.",
  moderate: "The classic build. Fitness grows over about six weeks while day-to-day fatigue fades within a week. Right for most athletes.",
  aggressive: "Sharp and fast. Big fitness swings and quicker peaks, with more risk. Best for a short, focused race block.",
};

// Step 3 — what they train with (drives the sync instructions they'll see)
// and how hard they want to be pushed.
export default function StepHardware({ form, setForm }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Watch className="w-4 h-4 text-primary" /> {ONBOARDING_COPY.dataConnectionModal.title}
        </div>
        <WearableStep
          selected={form.wearables}
          onToggle={(keys) => setForm((f) => ({ ...f, wearables: keys }))}
        />
        <p className="text-xs text-muted-foreground">
          {ONBOARDING_COPY.dataConnectionModal.trustMessage}
        </p>
      </div>

      <div>
        <Label>How hard should we push you?</Label>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {TIER_OPTIONS.map((t) => {
            const active = form.tier === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, tier: t.value }))}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                }`}
              >
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">
                  {TIER_PLAIN[t.value]}
                </span>
              </button>
            );
          })}
        </div>
        <Accordion type="single" collapsible className="mt-2">
          <AccordionItem value="maths" className="border-0">
            <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-2">
              The maths behind this (optional)
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                {TIER_EXPLAINER[form.tier]}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}