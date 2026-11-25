import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { choosePlanWeek, localPlanDate } from "@/lib/planWeekNavigation";

const ZONE_BAR_COLORS = { Z1: "bg-secondary", Z2: "bg-primary/50", Z3: "bg-primary", Z4: "bg-chart-4", Z5: "bg-destructive" };

function zoneDistribution(days) {
  const totals = {};
  let sum = 0;
  for (const day of days || []) {
    const zone = (day.prescribed_intensity_zone || "").toUpperCase();
    const key = ZONE_BAR_COLORS[zone] ? zone : null;
    if (!key) continue;
    const minutes = day.prescribed_duration_minutes || 0;
    totals[key] = (totals[key] || 0) + minutes;
    sum += minutes;
  }
  if (sum === 0) return [];
  return Object.entries(totals).map(([zone, minutes]) => ({ zone, pct: (minutes / sum) * 100 }));
}

const ZONE_COLORS = { Rest: "outline", Z1: "outline", Z2: "secondary", Z3: "secondary", Z4: "default", Z5: "destructive" };

export default function TrainingPlanWeeklyBreakdown({ weeklyPlans }) {
  const [openWeek, setOpenWeek] = useState(() => choosePlanWeek(weeklyPlans));
  const today = localPlanDate();
  if (!weeklyPlans || weeklyPlans.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 space-y-1">
        <CardTitle className="text-sm font-heading">Your week-by-week training</CardTitle>
        <p className="text-xs text-muted-foreground">The current or next scheduled week opens first. Select another week to review its sessions.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {weeklyPlans.map((week) => {
          const isOpen = openWeek === week.week_number;
          const distribution = zoneDistribution(week.days);
          return (
            <div key={week.week_number} className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`training-week-${week.week_number}`}
                onClick={() => setOpenWeek(isOpen ? null : week.week_number)}
                className="w-full min-h-11 flex items-center gap-3 px-4 py-3 text-left hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Week {week.week_number}, {week.theme}</p>
                  <p className="text-xs text-muted-foreground">{week.totals}</p>
                </div>
                {distribution.length > 0 && (
                  <div className="w-28 h-2 rounded-full overflow-hidden flex shrink-0">
                    {distribution.map((d) => (
                      <div key={d.zone} className={ZONE_BAR_COLORS[d.zone]} style={{ width: `${d.pct}%` }} title={d.zone} />
                    ))}
                  </div>
                )}
              </button>
              {isOpen && (
                <div id={`training-week-${week.week_number}`} className="divide-y divide-border">
                  {week.days?.map((day, idx) => (
                    <div key={idx} className={`px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2 ${day.date === today ? "bg-accent/50 border-l-2 border-primary" : ""}`}>
                      <div className="sm:w-32 shrink-0">
                        <p className="text-sm font-medium flex items-center gap-2">{day.day_name}{day.date === today && <span className="text-xs text-primary">Today</span>}</p>
                        <p className="text-xs text-muted-foreground">{day.date}</p>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{day.title}</span>
                          {day.prescribed_intensity_zone && (
                            <Badge variant={ZONE_COLORS[day.prescribed_intensity_zone] || "secondary"}>{day.prescribed_intensity_zone}</Badge>
                          )}
                          {day.prescribed_duration_minutes > 0 && (
                            <span className="text-xs text-muted-foreground">{day.prescribed_duration_minutes} min</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{day.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}