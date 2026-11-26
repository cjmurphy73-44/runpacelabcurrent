import React from "react";
import { useSearchParams } from "react-router-dom";
import moment from "moment";
import PageShell from "@/components/layout/PageShell";
import { useAthlete } from "@/hooks/useAthlete";
import TrainingCalendar from "@/components/dashboard/TrainingCalendar";
import { CalendarRange } from "lucide-react";

export default function Calendar() {
  const { athlete, loading } = useAthlete();
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get("date");
  const today = moment().format("YYYY-MM-DD");
  const startDate = moment(date, "YYYY-MM-DD", true).isValid() ? date : today;

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  }
  if (!athlete) {
    return <div className="text-center py-20 text-muted-foreground">Set up your athlete profile to view your calendar.</div>;
  }

  return (
    <PageShell
      title="Training Calendar"
      icon={CalendarRange}
      maxWidth="max-w-6xl"
    >
      <TrainingCalendar athleteId={athlete.id} currentTsb={athlete.current_tsb} startDate={startDate}
        onChangeWeek={(nextDate) => setSearchParams(nextDate === today ? {} : { date: nextDate })} />
    </PageShell>
  );
}
