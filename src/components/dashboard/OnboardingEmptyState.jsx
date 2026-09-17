import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Watch, Plus } from "lucide-react";
import HelpLink from "@/components/guide/HelpLink";

// Friendly, action-oriented empty state shown to beta testers who have created a
// profile but logged no workouts yet. Replaces blank charts/spinners with clear CTAs.
export default function OnboardingEmptyState({ athlete, onAddManual }) {
  const name = athlete?.first_name ? `, ${athlete.first_name}` : "";
  return (
    <Card className="border-dashed border-2 shadow-none">
      <CardContent className="pt-8 pb-8 text-center space-y-5 max-w-xl mx-auto">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Activity className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-heading font-bold">Welcome to your training log{name}!</h2>
          <p className="text-sm text-muted-foreground">
            You don't have any activities yet. Connect your training device (Coros, Garmin, Strava…) or add a
            manual session and we'll start tracking your fitness{" "}
            <span className="font-medium text-foreground">CTL</span>, fatigue{" "}
            <span className="font-medium text-foreground">ATL</span> and form{" "}
            <span className="font-medium text-foreground">TSB</span> right away.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={onAddManual}>
            <Plus className="w-4 h-4" /> Add a manual workout
          </Button>
          <Button asChild variant="outline">
            <Link to="/import">
              <Watch className="w-4 h-4" /> Connect a device / import files
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tip: even a single 30-minute session is enough to light up the dashboard and let you watch the engine work.
        </p>
        <HelpLink section="getting-started" label="Read the getting-started guide" />
      </CardContent>
    </Card>
  );
}