import React from "react";
import { Link } from "react-router-dom";
import { useAthlete } from "@/hooks/useAthlete";
import PageShell from "@/components/layout/PageShell";
import FitnessTrendCharts from "@/components/analytics/FitnessTrendCharts";
import PowerPaceHistograms from "@/components/analytics/PowerPaceHistograms";
import RaceTaperCalculator from "@/components/analytics/RaceTaperCalculator";
import AnomalyAlertBanner from "@/components/analytics/AnomalyAlertBanner";
import PerformanceTrendMatrix from "@/components/analytics/PerformanceTrendMatrix";
import ComplianceHeatmap from "@/components/analytics/ComplianceHeatmap";
import { Loader2, CalendarClock, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CollapsibleSection from "@/components/ui/CollapsibleSection";

export default function AdvancedAnalytics() {
  const { athlete, loading, error } = useAthlete();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading analytics…
      </div>
    );
  }

  if (error) {
    // Profile lookup failed (transient RLS/network blip). Don't imply the
    // profile is missing — offer retry and a link to profile settings.
    return (
      <PageShell title="Advanced Analytics" description="Long-term fitness trends, workload distributions, and race taper planning.">
        <div className="max-w-md mx-auto py-12">
          <Card className="border-dashed text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <Activity className="w-6 h-6 text-accent-foreground" />
              </div>
              <h2 className="text-lg font-heading font-semibold">Couldn't reach your profile</h2>
              <p className="text-sm text-muted-foreground">
                We hit a snag loading your data. This is usually momentary — try again, or check your profile settings.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={() => window.location.reload()}>Retry</Button>
                <Button asChild variant="outline">
                  <Link to="/settings">Profile settings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  if (!athlete) {
    // Confirmed: no profile exists for this account → onboarding is required.
    return (
      <PageShell title="Advanced Analytics" description="Long-term fitness trends, workload distributions, and race taper planning.">
        <div className="max-w-2xl mx-auto py-16 text-center text-muted-foreground space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
            <Activity className="w-6 h-6 text-accent-foreground" />
          </div>
          <p>Create your athlete profile from the dashboard to unlock advanced analytics.</p>
          <Button asChild>
            <Link to="/app">Go to dashboard</Link>
          </Button>
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