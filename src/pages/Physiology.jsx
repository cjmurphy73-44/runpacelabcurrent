import React from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/layout/PageShell";
import { useAthlete } from "@/hooks/useAthlete";
import { FitnessProvider } from "@/context/FitnessContext";
import PhysiologyLab from "@/components/dashboard/PhysiologyLab";
import RestHistoryReview from "@/components/physiology/RestHistoryReview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlaskConical, Activity, Upload, ArrowRight } from "lucide-react";

export default function Physiology() {
  const { athlete, loading } = useAthlete();

  return (
    <PageShell
      title="Physiology Lab"
      description="Training load, form, threshold trends and benchmarks based on your available data."
      icon={FlaskConical}
      maxWidth="max-w-6xl"
    >
      {loading ? (
        <div role="status" aria-live="polite" className="space-y-4 py-4">
          <span className="sr-only">Loading your physiology data</span>
          <div aria-hidden="true" className="h-8 w-56 max-w-full animate-pulse rounded-md bg-muted" />
          <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-lg border border-border bg-muted/60" />
            ))}
          </div>
          <div aria-hidden="true" className="h-48 animate-pulse rounded-lg border border-border bg-muted/40" />
        </div>
      ) : !athlete ? (
        <Card className="max-w-2xl border-border">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:p-8">
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <Activity className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading text-xl font-semibold">Start with your athlete profile</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your Physiology Lab uses your profile and recorded training sessions.
                Set up your profile first, then import a supported workout file or log a session.
                Metrics appear when enough data is available; missing measurements are not estimated as recorded values.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="min-h-11 gap-2">
                <Link to="/app">Set up profile <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11 gap-2">
                <Link to="/import"><Upload className="h-4 w-4" aria-hidden="true" /> Import workout</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <FitnessProvider athleteId={athlete.id}>
          <RestHistoryReview athleteId={athlete.id} />
          <PhysiologyLab athlete={athlete} />
        </FitnessProvider>
      )}
    </PageShell>
  );
}