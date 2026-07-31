import React from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

export default function PerformanceChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="load" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="tsb" orientation="right" tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area yAxisId="load" type="monotone" dataKey="calculated_ctl" name="CTL (Fitness)" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
        <Line yAxisId="load" type="monotone" dataKey="calculated_atl" name="ATL (Fatigue)" stroke="#ef4444" strokeWidth={1.5} dot={false} />
        <Line yAxisId="tsb" type="monotone" dataKey="calculated_tsb" name="TSB (Form)" stroke="#22c55e" strokeWidth={2} dot={false} />
        <ReferenceLine yAxisId="tsb" y={0} stroke="#94a3b8" strokeDasharray="4 4" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}