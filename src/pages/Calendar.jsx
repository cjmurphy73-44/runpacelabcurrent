import React from "react";
import PageShell from "@/components/layout/PageShell";
import { useAthlete } from "@/hooks/useAthlete";
import TrainingCalendar from "@/components/dashboard/TrainingCalendar";
import { CalendarRange } from "lucide-react";

export default function Calendar() {
  const { athlete, loading } = useAthlete();

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  }
  if (!athlete) {
    return <div className="text-center py-20 text-muted-foreground">Set up your athlete profile to view your calendar.</div>;
  }

  return (
    <PageShell
      title="Training Calendar"
      description="Your next 7 days of prescribed sessions, with AI microadjustment on demand."
      icon={CalendarRange}
      maxWidth="max-w-6xl"
    >
      <TrainingCalendar athleteId={athlete.id} currentTsb={athlete.current_tsb} />
    </PageShell>
  );
}