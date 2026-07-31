import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useFitness } from "@/context/FitnessContext";
import moment from "moment";

function buildSeries(biometricTelemetry) {
  const sorted = [...biometricTelemetry].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((r, idx) => {
    const window = sorted.slice(Math.max(0, idx - 6), idx + 1).map((w) => w.hrv_ms).filter((v) => typeof v === "number");
    const rollingAvg = window.length ? window.reduce((a, b) => a + b, 0) / window.length : null;
    return { date: moment(r.date).format("MMM D"), hrv_ms: r.hrv_ms, rolling_baseline: rollingAvg ? Math.round(rollingAvg * 10) / 10 : null };
  });
}

export default function AutonomicStressCard() {
  const { biometricTelemetry } = useFitness();
  const data = useMemo(() => buildSeries(biometricTelemetry), [biometricTelemetry]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">Autonomic Stress (HRV)</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No HRV data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="hrv_ms" name="HRV" stroke="#3b82f6" dot={false} />
              <Line type="monotone" dataKey="rolling_baseline" name="7-day Baseline" stroke="#94a3b8" strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}