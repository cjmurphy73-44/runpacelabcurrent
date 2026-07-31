import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFitness } from "@/context/FitnessContext";
import RecoveryCsvDropzone from "@/components/dashboard/RecoveryCsvDropzone";
import BiometricLogForm from "@/components/dashboard/BiometricLogForm";
import moment from "moment";

function buildRows(biometricTelemetry) {
  const sorted = [...biometricTelemetry].sort((a, b) => b.date.localeCompare(a.date));
  const hrvValues = sorted.map((r) => r.hrv_ms).filter((v) => typeof v === "number");
  const baseline = hrvValues.length ? hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length : null;

  return sorted.slice(0, 14).map((r) => {
    const suppressed = baseline && typeof r.hrv_ms === "number" && r.hrv_ms < baseline * 0.85;
    return { ...r, suppressed, baseline };
  });
}

export default function RecoveryLab({ athleteId }) {
  const { biometricTelemetry, loading } = useFitness();
  const rows = useMemo(() => buildRows(biometricTelemetry), [biometricTelemetry]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">Recovery Lab</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 overflow-x-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No biometric data yet — drop a file or log today's metrics.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">HRV (ms)</th>
                    <th className="py-2 pr-3">Sleep Score</th>
                    <th className="py-2 pr-3">Sleep (hrs)</th>
                    <th className="py-2 pr-3">Active Cal</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={`border-b border-border last:border-0 ${r.suppressed ? "bg-destructive/10" : ""}`}>
                      <td className="py-2 pr-3">{moment(r.date).format("MMM D")}</td>
                      <td className="py-2 pr-3">{r.hrv_ms ?? "-"}</td>
                      <td className="py-2 pr-3">{r.sleep_score ?? "-"}</td>
                      <td className="py-2 pr-3">{r.sleep_duration_hours ?? "-"}</td>
                      <td className="py-2 pr-3">{r.active_calories ?? "-"}</td>
                      <td className="py-2 pr-3">
                        {r.suppressed ? (
                          <Badge variant="destructive">Suppressed Recovery State</Badge>
                        ) : (
                          <Badge variant="secondary">Normal</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="space-y-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
            <RecoveryCsvDropzone athleteId={athleteId} />
            <div className="border-t border-border pt-4">
              <BiometricLogForm athleteId={athleteId} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}