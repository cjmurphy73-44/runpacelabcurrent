import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Post-Workout Insight Engine entry point.
// Invoked after a workout is ingested (by workoutWebhook) or on demand.
// Produces an AI evaluation, persists a CoachMessage AND a structured
// WorkoutFeedback insight record (with intensity classification), then
// links the feedback back to the WorkoutSession for UI resolution.
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

    // 2. Invoke the AI Coach for a structured evaluation (intensity + feedback + highlights)
    const aiEvaluation: any = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this workout session for athlete ${athlete_id}:
      Sport: ${workout.sport}
      Duration: ${workout.duration_minutes} mins
      Distance: ${workout.distance_km} km
      Avg HR: ${workout.avg_hr} bpm
      Max HR: ${workout.max_hr} bpm
      TRIMP: ${workout.session_trimp}
      Provide a JSON object with:
      - "intensity": one of "easy" | "moderate" | "hard" | "very_hard" (the dominant physiological intensity of the session)
      - "feedback": 2-3 concise coaching takeaways and training guidance as a single string paragraph
      - "highlights": array of 2-4 short bullet strings of the key insights.`,
      response_json_schema: {
        type: 'object',
        properties: {
          intensity: { type: 'string', enum: ['easy', 'moderate', 'hard', 'very_hard'] },
          feedback: { type: 'string' },
          highlights: { type: 'array', items: { type: 'string' } },
        },
        required: ['intensity', 'feedback'],
      },
    });

    const feedbackText = aiEvaluation?.feedback ? aiEvaluation.feedback : String(aiEvaluation);
    const intensity = aiEvaluation?.intensity ? aiEvaluation.intensity : 'moderate';
    const highlights = Array.isArray(aiEvaluation?.highlights) ? aiEvaluation.highlights : [];

    // 3. Persist the coaching message (existing behavior)
    const coachMsg = await base44.entities.CoachMessage.create({
      athlete_id: athlete_id,
      message_type: 'performance_summary',
      content_text: feedbackText,
      triggered_by_workout_session_id: workout_id,
    });

    // 4. Persist the structured WorkoutFeedback insight record
    const feedbackRecord = await base44.entities.WorkoutFeedback.create({
      workout_id: workout_id,
      athlete_id: athlete_id,
      feedback: feedbackText,
      status: 'complete',
      intensity: intensity,
      highlights: highlights,
    });

    // 5. Link the feedback back to the session so the UI can resolve it from the workout
    try {
      await base44.entities.WorkoutSession.update(workout_id, { post_workout_feedback_id: feedbackRecord.id });
    } catch (linkErr) {
      console.warn('Failed to link feedback to session:', linkErr);
    }

    return new Response(
      JSON.stringify({ success: true, evaluation: coachMsg, feedback: feedbackRecord }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Evaluation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});