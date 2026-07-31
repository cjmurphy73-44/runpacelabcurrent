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
    if (athlete.created_by_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    await Promise.all([
      base44.entities.WorkoutSession.deleteMany({ athlete_id }),
      base44.entities.TrainingPlanSession.deleteMany({ athlete_id }),
      base44.entities.TrainingPlan.deleteMany({ athlete_id }),
      base44.entities.BiometricTelemetry.deleteMany({ athlete_id }),
    ]);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});