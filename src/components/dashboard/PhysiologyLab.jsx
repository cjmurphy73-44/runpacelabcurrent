import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { BookOpen } from "lucide-react";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import RaceStrategyPlanner from "@/components/dashboard/RaceStrategyPlanner";
import WipWrapper from "@/components/common/WipWrapper";
import ThresholdTrendChart from "@/components/dashboard/ThresholdTrendChart";
import AutonomicStressCard from "@/components/dashboard/AutonomicStressCard";
import BaselineHistoryMatrix from "@/components/dashboard/BaselineHistoryMatrix";

function getTsbStatus(tsb) {
  if (tsb < -30) return { label: "Danger – Overtraining Risk", detail: "Fatigue is far outpacing fitness. Back off intensity and prioritize recovery immediately." };
  if (tsb < -15) return { label: "High Fatigue – Monitor Closely", detail: "Significant training stress is accumulating. This is normal during a build phase, but watch sleep, HRV and mood." };
  if (tsb <= 5) return { label: "Optimal Training Balance", detail: "You're absorbing load while staying productive — the sweet spot for consistent training." };
  if (tsb <= 25) return { label: "Fresh / Racing Ready", detail: "Fatigue has faded and fitness is showing through. Good window for key workouts or racing." };
  return { label: "Heavily Freshened / Peaked", detail: "Training load has dropped well below your fitness. Great for racing, but prolonged periods here mean fitness may start to erode — the AI coach will stay conservative and look to reintroduce load gradually." };
}

export default function PhysiologyLab({ athlete }) {
  const tsb = athlete.current_tsb || 0;
  const status = getTsbStatus(tsb);

  return (
    <div className="space-y-6">
      <Alert className="max-w-3xl">
        <AlertTitle>Current Form (TSB): {tsb.toFixed(1)} — {status.label}</AlertTitle>
        <AlertDescription>{status.detail}</AlertDescription>
      </Alert>

      <CollapsibleSection
        title="Load model legend"
        subtitle="CTL · ATL · TSB"
        icon={BookOpen}
        className="max-w-3xl"
      >
        <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Fitness (CTL)</span> — 42-day rolling load average; the foundation that lets you absorb bigger weeks.</p>
        <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Fatigue (ATL)</span> — 7-day stress; spikes drive adaptation, sustained highs raise injury risk.</p>
        <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Form (TSB = CTL − ATL)</span> — +5 to −15 optimal training · +10 to +25 fresh / racing · below −30 overtraining danger.</p>
      </CollapsibleSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ThresholdTrendChart />
        <AutonomicStressCard />
      </div>

      <BaselineHistoryMatrix athleteId={athlete.id} />

      <WipWrapper isWip={true} featureName="Race Strategy Engine">
        <RaceStrategyPlanner athleteId={athlete.id} />
      </WipWrapper>
    </div>
  );
}