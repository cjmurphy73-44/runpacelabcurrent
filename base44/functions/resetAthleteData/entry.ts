import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_id } = await req.json();
    if (!athlete_id) return Response.json({ error: 'athlete_id is required' }, { status: 400 });

    const athlete = await base44.entities.AthleteProfile.get(athlete_id);
    if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });
    if (athlete.created_by_id !== user.id && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // asServiceRole bypasses RLS so coach-/system-created rows (WorkoutFeedback,
    // CoachMessage, WebhookEvent, OAuth connections) are cleared too.
    const e = base44.asServiceRole.entities;
    await Promise.all([
      e.WorkoutSession.deleteMany({ athlete_id }),
      e.WorkoutAsset.deleteMany({ athlete_id }),
      e.DailyMetrics.deleteMany({ athlete_id }),
      e.TrainingPlan.deleteMany({ athlete_id }),
      e.TrainingPlanSession.deleteMany({ athlete_id }),
      e.WorkoutFeedback.deleteMany({ athlete_id }),
      e.CoachMessage.deleteMany({ athlete_id }),
      e.WebhookEvent.deleteMany({ athlete_id }),
      e.GarminConnection.deleteMany({ athlete_id }),
      e.StravaConnection.deleteMany({ athlete_id }),
      e.CorosConnection.deleteMany({ athlete_id }),
      e.WearableConnection.deleteMany({ athlete_id }),
    ]);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});