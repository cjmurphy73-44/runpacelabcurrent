import React, { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from "recharts";

// Pro-Athlete Obsidian theme — dark HR-zone chart surface, gradient zone boundary fills.
const ZONE_META = [
  { label: "Z1 Recovery", from: "#1E3A5F", to: "#38BDF8" },
  { label: "Z2 Endurance", from: "#0F4D3A", to: "#34D399" },
  { label: "Z3 Tempo", from: "#4D2F0F", to: "#F59E0B" },
  { label: "Z4 Threshold", from: "#4D1F1F", to: "#FB7185" },
  { label: "Z5 Anaerobic", from: "#3A0F3A", to: "#E879F9" },
];

export default function HRZoneBreakdown({ zones }) {
  const data = useMemo(
    () => ZONE_META.map((z, i) => ({ label: z.label, pct: Math.round((zones && zones[i] ? zones[i].pct : 0) || 0) })),
    [zones]
  );

  return (
    <div className="rounded-xl p-3 w-full" style={{ background: "#0B0D0E", border: "1px solid #1F2937" }}>
      <ResponsiveContainer width="100%" height={188}>
        <BarChart data={data} layout="vertical" syncId="obsidian-zones" margin={{ top: 4, right: 30, left: 8, bottom: 4 }}>
          <defs>
            {ZONE_META.map((z, i) => (
              <linearGradient key={i} id={`zoneGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={z.from} stopOpacity={0.9} />
                <stop offset="100%" stopColor={z.to} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>
          <XAxis type="number" domain={[0, 100]} stroke="#1F2937" tick={{ fontSize: 10, fill: "#6B7280" }} />
          <YAxis type="category" dataKey="label" stroke="#1F2937" tick={{ fontSize: 10, fill: "#9CA3AF" }} width={96} />
          <Tooltip
            cursor={{ fill: "#1F2937", fillOpacity: 0.4 }}
            contentStyle={{ background: "#121518", border: "1px solid #1F2937", borderRadius: 8, color: "#E5E7EB", fontSize: 12 }}
            labelStyle={{ color: "#9CA3AF" }}
            formatter={(v) => [`${v}%`, "Time in zone"]}
          />
          <Bar dataKey="pct" radius={[4, 4, 4, 4]} barSize={16} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={`url(#zoneGrad${i})`} />
            ))}
            <LabelList dataKey="pct" position="right" formatter={(v) => `${v}%`} style={{ fill: "#9CA3AF", fontSize: 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}