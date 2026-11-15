// Calendar dates remain YYYY-MM-DD strings in the athlete's local calendar.
// Avoid UTC conversion, which can shift today's session in Australian time zones.
export function localPlanDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isCalendarDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function choosePlanWeek(weeklyPlans, today = localPlanDate()) {
  if (!Array.isArray(weeklyPlans) || weeklyPlans.length === 0) return null;
  const weeks = weeklyPlans.map((week) => ({
    number: week?.week_number,
    dates: (Array.isArray(week?.days) ? week.days : [])
      .map((day) => day?.date)
      .filter(isCalendarDate)
      .sort(),
  })).filter((week) => week.number != null);
  // Dates may be nonconsecutive; a week spans its first and final planned day.
  const current = weeks.find((week) => week.dates.length > 0 &&
    week.dates[0] <= today && week.dates[week.dates.length - 1] >= today);
  if (current) return current.number;
  const next = weeks.find((week) => week.dates.some((date) => date > today));
  return (next || weeks[0])?.number ?? null;
}
