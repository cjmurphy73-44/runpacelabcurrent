import React, { useMemo } from "react";
import { useAthlete } from "@/hooks/useAthlete";
import PageShell from "@/components/layout/PageShell";
import FitnessTrendCharts from "@/components/analytics/FitnessTrendCharts";
import PowerPaceHistograms from "@/components/analytics/PowerPaceHistograms";
import RaceTaperCalculator from "@/components/analytics/RaceTaperCalculator";
import AnomalyAlertBanner from "@/components/analytics/AnomalyAlertBanner";
import PerformanceTrendMatrix from "@/components/analytics/PerformanceTrendMatrix";
import ComplianceHeatmap from "@/components/analytics/ComplianceHeatmap";
import { Loader2, CalendarClock } from "lucide-react";
import CollapsibleSection from "@/components/ui/CollapsibleSection";

export default function AdvancedAnalytics() {
  const { athlete, loading } = useAthlete();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading analytics…
      </div>
    );
  }

  if (!athlete) {
    return (
      <PageShell title="Advanced Analytics" description="Long-term fitness trends, workload distributions, and race taper planning.">
        <div className="max-w-2xl mx-auto py-16 text-center text-muted-foreground">
          Create your athlete profile from the dashboard to unlock advanced analytics.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Advanced Analytics" description="Long-term fitness trends, workload distributions, and race taper planning.">
      <div className="space-y-6">
        <AnomalyAlertBanner athleteId={athlete.id} maxHr={athlete.max_heart_rate} />
        <PerformanceTrendMatrix athleteId={athlete.id} />
        <ComplianceHeatmap athleteId={athlete.id} maxHr={athlete.max_heart_rate} />
        <FitnessTrendCharts athleteId={athlete.id} />
        <PowerPaceHistograms
          athleteId={athlete.id}
          maxHr={athlete.max_heart_rate}
          lthr={athlete.lactate_threshold_hr}
          ftpWatts={athlete.ftp_watts}
        />
        <CollapsibleSection title="Race Taper Calculator" subtitle="optional planning tool" icon={CalendarClock}>
          <RaceTaperCalculator athlete={athlete} />
        </CollapsibleSection>
      </div>
    </PageShell>
  );
}