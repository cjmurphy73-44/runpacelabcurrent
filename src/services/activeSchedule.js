import { base44 } from "@/api/base44Client";

export async function loadActiveSchedule(athleteId, start, end) {
  const [plan] = await base44.entities.TrainingPlan.filter(
    { athlete_id: athleteId, status: "active" }, "-created_date", 1,
  );
  if (!plan) return { plan: null, sessions: [], workoutBySession: {} };

  const sessions = await base44.entities.TrainingPlanSession.filter({
    athlete_id: athleteId, training_plan_id: plan.id, date: { $gte: start, $lte: end },
  }, "date", 50);
  const completedIds = sessions.filter(session => ["completed", "partial", "excess"].includes(session.status))
    .map(session => session.id);
  const workouts = completedIds.length ? await base44.entities.WorkoutSession.filter({
    athlete_id: athleteId, training_plan_session_id: { $in: completedIds },
  }, "-date", 50, 0, ["id", "training_plan_session_id"]).catch(() => []) : [];
  const workoutBySession = {};
  for (const workout of workouts) {
    workoutBySession[workout.training_plan_session_id] ??= workout.id;
  }
  return { plan, sessions, workoutBySession };
}
