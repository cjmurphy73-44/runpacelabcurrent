import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Permanently deletes the calling user's account and all owned data.
// Triggered from the Athlete Settings Danger Zone. There is no client-side
// deleteMe() in the auth SDK, so this service-role function performs the
// deletion: it first clears the user's data across all owned entities
// (best-effort), then deletes the User record itself.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const e = base44.asServiceRole.entities;
    const owned = { created_by_id: user.id };

    // Best-effort cleanup of the user's data; a failure on one entity must not
    // block the account deletion itself.
    const cleanup = [
      () => e.WorkoutSession.deleteMany(owned),
      () => e.WorkoutAsset.deleteMany(owned),
      () => e.DailyMetrics.deleteMany(owned),
      () => e.TrainingPlan.deleteMany(owned),
      () => e.TrainingPlanSession.deleteMany(owned),
      () => e.CoachMessage.deleteMany(owned),
      () => e.WorkoutFeedback.deleteMany(owned),
      () => e.AthleteProfile.deleteMany(owned),
      () => e.GarminConnection.deleteMany(owned),
      () => e.StravaConnection.deleteMany(owned),
      () => e.CorosConnection.deleteMany(owned),
      () => e.WearableConnection.deleteMany(owned),
      () => e.CoachAthleteAssignment.deleteMany({ coach_user_id: user.id }),
    ];
    for (const del of cleanup) {
      try { await del(); } catch (err) { /* best-effort; continue */ }
    }

    // Finally, delete the user account record itself.
    await base44.asServiceRole.entities.User.delete(user.id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}