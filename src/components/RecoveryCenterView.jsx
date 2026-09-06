import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import RecoveryUpload from "@/components/recovery/RecoveryUpload";
import BiometricLogForm from "@/components/dashboard/BiometricLogForm";
import { useFitness } from "@/context/FitnessContext";
import moment from "moment";

export default function RecoveryCenterView({ athleteId }) {
  const { dailyMetrics, loading } = useFitness();
  const rows = [...dailyMetrics].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Work In Progress</AlertTitle>
        <AlertDescription>
          Automated wearable integration (WHOOP, Oura, Garmin) is pending. Upload a CSV/JSON export or log today's metrics manually.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <RecoveryUpload athleteId={athleteId} />
        <Card>
          <CardHeader><CardTitle className="text-sm font-heading">Quick log</CardTitle></CardHeader>
          <CardContent><BiometricLogForm athleteId={athleteId} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-heading">Recent recovery</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…</div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recovery data yet — upload a file or log today's metrics.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">HRV (ms)</th>
                    <th className="py-2 pr-3">Sleep</th>
                    <th className="py-2 pr-3">Resting HR</th>
                    <th className="py-2 pr-3">Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3">{moment(r.date).format("MMM D")}</td>
                      <td className="py-2 pr-3">{r.hrv ?? "-"}</td>
                      <td className="py-2 pr-3">{r.sleep_score ?? "-"}</td>
                      <td className="py-2 pr-3">{r.resting_hr ?? "-"}</td>
                      <td className="py-2 pr-3">{r.readiness_score ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}