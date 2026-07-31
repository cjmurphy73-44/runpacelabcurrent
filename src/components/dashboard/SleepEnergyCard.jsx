import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useFitness } from "@/context/FitnessContext";
import moment from "moment";

export default function SleepEnergyCard() {
  const { biometricTelemetry } = useFitness();
  const data = useMemo(
    () => [...biometricTelemetry]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({ date: moment(r.date).format("MMM D"), sleep_duration_hours: r.sleep_duration_hours, sleep_score: r.sleep_score, active_calories: r.active_calories })),
    [biometricTelemetry]
  );

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">Sleep & Energy</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sleep/energy data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={data}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="sleep_duration_hours" name="Sleep (hrs)" fill="#3b82f6" barSize={12} />
              <Bar yAxisId="right" dataKey="active_calories" name="Active Cal" fill="#f59e0b" barSize={12} />
              <Line yAxisId="left" type="monotone" dataKey="sleep_score" name="Sleep Score" stroke="#22c55e" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}