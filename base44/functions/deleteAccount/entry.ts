import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { finalizeAccountDeletion } from '../../shared/accountDeletionCleanup.js';

// Permanently deletes the calling user's account and all owned data.
// Triggered from the Athlete Settings Danger Zone. There is no client-side
// deleteMe() in the auth SDK, so this service-role function performs the
// deletion: it first clears the user's data across all owned entities
// before deleting the User record. A cleanup failure keeps the account
// available for a retry rather than falsely reporting successful deletion.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const e = base44.asServiceRole.entities;
    const owned = { created_by_id: user.id };

    // Keep entity labels in failure reports, never record contents or secrets.
    const cleanup = [
      ["WorkoutSession", () => e.WorkoutSession.deleteMany(owned)],
      ["WorkoutAsset", () => e.WorkoutAsset.deleteMany(owned)],
      ["DailyMetrics", () => e.DailyMetrics.deleteMany(owned)],
      ["TrainingPlan", () => e.TrainingPlan.deleteMany(owned)],
      ["TrainingPlanSession", () => e.TrainingPlanSession.deleteMany(owned)],
      ["CoachMessage", () => e.CoachMessage.deleteMany(owned)],
      ["WorkoutFeedback", () => e.WorkoutFeedback.deleteMany(owned)],
      ["AthleteProfile", () => e.AthleteProfile.deleteMany(owned)],
      ["GarminConnection", () => e.GarminConnection.deleteMany(owned)],
      ["StravaConnection", () => e.StravaConnection.deleteMany(owned)],
      ["CorosConnection", () => e.CorosConnection.deleteMany(owned)],
      ["WearableConnection", () => e.WearableConnection.deleteMany(owned)],
      ["CoachAthleteAssignment", () => e.CoachAthleteAssignment.deleteMany({ coach_user_id: user.id })],
      // Also remove roster entries where THIS user is the athlete, so coaches
      // don't keep a dangling reference to a deleted profile.
      ...(user.data?.athlete_profile_id ? [["CoachAthleteAssignmentByAthlete", () => e.CoachAthleteAssignment.deleteMany({ athlete_profile_id: user.data.athlete_profile_id })]] : []),
      ["Subscription", () => e.Subscription.deleteMany({ user_id: user.id })],
      ["LabResult", () => e.LabResult.deleteMany(owned)],
      ["BetaFeedback", () => e.BetaFeedback.deleteMany(owned)],
      // WebhookEvent rows are written by service-role sync functions, so created_by_id
      // never points at the athlete; match on athlete_id instead or deletion leaves them.
      ...(user.data?.athlete_profile_id ? [["WebhookEvent", () => e.WebhookEvent.deleteMany({ athlete_id: user.data.athlete_profile_id })]] : []),
    ];
    const result = await finalizeAccountDeletion(cleanup, () => e.User.delete(user.id));
    if (!result.success) {
      // Do not remove the identity needed to retry incomplete cleanup.
      return Response.json({
        success: false,
        error: 'Account deletion is incomplete. Your account remains active; please retry or contact support.',
        failed_entities: result.failedEntities,
      }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Account deletion could not be completed. Please retry or contact support.' }, { status: 500 });
  }
}