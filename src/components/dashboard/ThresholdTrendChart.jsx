import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useFitness } from "@/context/FitnessContext";
import moment from "moment";

// VT1 (aerobic threshold) and VT2 (anaerobic threshold) are estimated from
// lactate threshold HR using standard offsets, since direct gas-exchange
// testing isn't available from wearable data.
function buildSeries(baselines) {
  return [...baselines]
    .filter((b) => typeof b.lactate_threshold_hr_bpm === "number")
    .sort((a, b) => a.recorded_date.localeCompare(b.recorded_date))
    .map((b) => ({
      date: moment(b.recorded_date).format("MMM D"),
      vt2_lthr: b.lactate_threshold_hr_bpm,
      vt1_est: Math.round(b.lactate_threshold_hr_bpm - 15),
      vo2max: b.vo2max_ml_kg_min ?? null,
    }));
}

export default function ThresholdTrendChart() {
  const { physiologicalBaselines } = useFitness();
  const data = useMemo(() => buildSeries(physiologicalBaselines), [physiologicalBaselines]);
  const latest = data[data.length - 1];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">VT1 / VT2 Threshold Trends</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Log a baseline test with Lactate Threshold HR to see estimated ventilatory threshold trends.</p>
        ) : (
          <>
            {latest && (
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Est. VT1 (Aerobic)</p>
                  <p className="font-heading text-lg">{latest.vt1_est} bpm</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Est. VT2 (LTHR)</p>
                  <p className="font-heading text-lg">{latest.vt2_lthr} bpm</p>
                </div>
              </div>
            )}
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={["dataMin - 10", "dataMax + 10"]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="vt2_lthr" name="VT2 (LTHR)" stroke="hsl(var(--zone-4))" dot />
                <Line type="monotone" dataKey="vt1_est" name="VT1 (Est.)" stroke="hsl(var(--zone-2))" dot />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">VT1 is estimated as LTHR − 15 bpm; log more baseline tests to refine trend accuracy over time.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}