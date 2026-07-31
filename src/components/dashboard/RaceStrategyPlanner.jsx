import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "@/components/ui/select";

const EVENT_GROUPS = [
  { label: "Track", options: ["800m", "1500m", "Mile"] },
  { label: "Middle Distance", options: ["5K", "10K"] },
  { label: "Road", options: ["Half Marathon", "Marathon"] },
  { label: "Ultra-Endurance", options: ["50K Ultra", "100K Ultra", "100 Mile Ultra"] },
  { label: "Triathlon", options: ["Olympic Distance Triathlon", "Ironman 70.3", "Ironman (Full)"] },
  { label: "Cycling", options: ["100km Cycling Gran Fondo"] },
];

export default function RaceStrategyPlanner({ athleteId }) {
  const [eventType, setEventType] = useState(EVENT_GROUPS[0].options[0]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    const res = await base44.functions.invoke("generateRaceStrategy", { athlete_id: athleteId, event_type: eventType });
    setPlan(res.data);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">AI Competition & Peaking Planner</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVENT_GROUPS.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.options.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={loading}>{loading ? "Generating..." : "Generate Plan"}</Button>
        </div>
        {plan && (
          <div className="space-y-4 border-t border-border pt-4">
            {plan.taper_plan?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3">Days to Race</th>
                      <th className="py-2 pr-3">Volume % of Peak</th>
                      <th className="py-2 pr-3">Focus</th>
                      <th className="py-2 pr-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.taper_plan.map((d, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0">
                        <td className="py-2 pr-3">{d.days_to_race}</td>
                        <td className="py-2 pr-3">{d.volume_percent_of_peak}%</td>
                        <td className="py-2 pr-3">{d.focus}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{d.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {plan.race_day_strategy && (
              <div>
                <p className="text-sm font-medium mb-1">Race-Day Execution Strategy</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.race_day_strategy}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}