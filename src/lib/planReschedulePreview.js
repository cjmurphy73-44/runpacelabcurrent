// Read-only planning preview. This module never grants permission to persist a
// change. Backend authorization must independently verify row ownership,
// plan identity, revision and audit state before any future write is enabled.
function validDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

export function previewPlanSessionMove({
  session, destination, sessions, athleteId, today, calendarEnd,
}) {
  if (!session?.id || !session.training_plan_id || !athleteId || session.athlete_id !== athleteId) {
    return { ok: false, reason: "Session identity or athlete scope is not verified." };
  }
  if (session.status !== "pending") {
    return { ok: false, reason: "Only pending prescribed sessions can be previewed for a move." };
  }
  if (!Array.isArray(sessions) || !sessions.some((row) => row?.id === session.id &&
    row.athlete_id === athleteId && row.training_plan_id === session.training_plan_id &&
    row.date === session.date && row.status === "pending")) {
    return { ok: false, reason: "The session is not in the verified loaded plan." };
  }
  if (![destination, today, calendarEnd, session.date].every(validDay)) {
    return { ok: false, reason: "Choose a valid calendar date." };
  }
  if (destination < today || destination > calendarEnd) {
    return { ok: false, reason: "Choose a date within the remaining displayed seven-day schedule." };
  }
  if (destination === session.date) {
    return { ok: false, reason: "Choose a different date from the original session." };
  }
  const conflicts = sessions.filter((other) => other?.id !== session.id &&
    other?.athlete_id === athleteId &&
    other?.date === destination &&
    other?.sport === session.sport &&
    other?.status === "pending");
  if (conflicts.length) {
    return { ok: false, reason: "Another pending session of the same sport is scheduled that day. Resolve the conflict before moving." };
  }
  return {
    ok: true,
    from: session.date,
    to: destination,
    sessionId: session.id,
    athleteId,
    trainingPlanId: session.training_plan_id,
    saved: false,
    reason: "Preview only. No changes have been saved to your training plan.",
  };
}
