import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { workout_id, athlete_id } = payload;

    if (!workout_id || !athlete_id) {
      return new Response(
        JSON.stringify({ error: 'workout_id and athlete_id are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch workout details
    const workout = await base44.entities.WorkoutSession.get(workout_id);

    // 2. Invoke the AI Coach Agent for evaluation
    const aiEvaluation = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this workout session for athlete ${athlete_id}:
      Sport: ${workout.sport}
      Duration: ${workout.duration_minutes} mins
      Distance: ${workout.distance_km} km
      Avg HR: ${workout.avg_hr} bpm
      TRIMP: ${workout.session_trimp}
      Provide 2-3 concise key takeaways and training guidance.`,
    });

    // 3. Save evaluation as a CoachMessage
    const coachMsg = await base44.entities.CoachMessage.create({
      athlete_id: athlete_id,
      message_type: 'performance_summary',
      content_text: aiEvaluation,
      triggered_by_workout_session_id: workout_id,
    });

    return new Response(
      JSON.stringify({ success: true, evaluation: coachMsg }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Evaluation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
