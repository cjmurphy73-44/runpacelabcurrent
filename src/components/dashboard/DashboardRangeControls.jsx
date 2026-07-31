import React from "react";
import { Button } from "@/components/ui/button";
import { useFitness } from "@/context/FitnessContext";

const RANGES = [
  { label: "Last 30 Days", value: 30 },
  { label: "Last 90 Days", value: 90 },
  { label: "Full Season (180d)", value: 180 },
];

export default function DashboardRangeControls() {
  const { visibleRange, setVisibleRange } = useFitness();

  return (
    <div className="flex items-center gap-2 mb-4">
      {RANGES.map((r) => (
        <Button
          key={r.value}
          size="sm"
          variant={visibleRange === r.value ? "default" : "outline"}
          onClick={() => setVisibleRange(r.value)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}