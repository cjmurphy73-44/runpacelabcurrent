import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-heading">Fitness (CTL)</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>A 42-day rolling average of your training load.</p>
            <p>Building CTL steadily over weeks and months increases your long-term performance capacity — it's the foundation that lets you handle bigger workouts without breaking down.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-heading">Fatigue (ATL)</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>A 7-day short-term measure of recent training stress.</p>
            <p>Short spikes in fatigue are necessary to trigger adaptation, but if it stays high without recovery, injury and burnout risk climbs.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-heading">Form (TSB)</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>The balance between Fitness and Fatigue (CTL − ATL).</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Optimal Training Balance: +5 to −15</li>
              <li>Fresh / Racing: +10 to +25</li>
              <li>Overtraining Danger: below −30</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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