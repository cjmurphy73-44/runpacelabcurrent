import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import AIDeepDiveCard from "@/components/dashboard/AIDeepDiveCard";
import LifestyleFactorForm from "@/components/dashboard/LifestyleFactorForm";
import { useFitness } from "@/context/FitnessContext";

export default function DataCommandCenter({ athleteId }) {
  const { reload } = useFitness();
  const [resetting, setResetting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState(null);

  const handleReset = async () => {
    setResetting(true);
    await base44.functions.invoke("resetAthleteData", { athlete_id: athleteId });
    await reload();
    setMessage("All workout, plan, and biometric data has been purged.");
    setResetting(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await base44.functions.invoke("refreshTelemetryState", { athlete_id: athleteId });
    await reload();
    setMessage("CTL/ATL/TSB have been recalculated from the latest data.");
    setRefreshing(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm font-heading">Data Command Center</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex-1" disabled={resetting}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {resetting ? "Purging..." : "Purge & Reset All Data"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Purge all training data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes all workout sessions, training plans, and biometric telemetry for this athlete. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>Yes, purge everything</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" className="flex-1" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {refreshing ? "Refreshing..." : "Force System Refresh"}
            </Button>
          </div>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <AIDeepDiveCard athleteId={athleteId} />

      <Card>
        <CardHeader><CardTitle className="text-sm font-heading">Extra-Training Factors</CardTitle></CardHeader>
        <CardContent>
          <LifestyleFactorForm athleteId={athleteId} />
        </CardContent>
      </Card>
    </div>
  );
}