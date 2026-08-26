import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Post-Workout Insight Engine entry point.
// Invoked after a workout is ingested (by workoutWebhook) or on demand / retry.
// Produces an AI evaluation, persists a CoachMessage AND a structured
// WorkoutFeedback insight record (with intensity classification), then links
// the feedback back to the WorkoutSession for UI resolution.
//
// Resilience: the LLM call is retried up to MAX_LLM_ATTEMPTS times. If it still
// fails (timeout / provider error / empty response), a WorkoutFeedback record
// is upserted with status: "failed" and a fallback message, so the UI can show
// a clear error state with a retry option instead of staying blank indefinitely.

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

    let feedbackRecord: any;
    let coachMsg: any = null;
    let failed = false;

    try {
      // 2. Invoke the AI Coach (with retry) for a structured evaluation
      const aiEvaluation: any = await invokeWithRetry(base44, workout, athlete_id);
      const feedbackText = aiEvaluation?.feedback ? aiEvaluation.feedback : String(aiEvaluation);
      const intensity = aiEvaluation?.intensity ? aiEvaluation.intensity : 'moderate';
      const highlights = Array.isArray(aiEvaluation?.highlights) ? aiEvaluation.highlights : [];

      // 3. Persist the coaching message (happy path only)
      coachMsg = await base44.entities.CoachMessage.create({
        athlete_id: athlete_id,
        message_type: 'performance_summary',
        content_text: feedbackText,
        triggered_by_workout_session_id: workout_id,
      });

      // 4. Upsert the structured WorkoutFeedback insight record (complete)
      feedbackRecord = await upsertFeedback(base44, workout_id, athlete_id, {
        feedback: feedbackText,
        status: 'complete',
        intensity: intensity,
        highlights: highlights,
      });
    } catch (evalErr: any) {
      // LLM failed after retries — persist a failed-state record so the UI can
      // surface a retry affordance rather than a blank insight section.
      failed = true;
      console.warn('postWorkoutAIEvaluation LLM failed after retry:', evalErr?.message);
      feedbackRecord = await upsertFeedback(base44, workout_id, athlete_id, {
        feedback: "The AI coach couldn't analyse this session this time. Tap retry to try again.",
        status: 'failed',
        intensity: 'moderate',
        highlights: [] as string[],
      });
    }

    // 5. Link the feedback back to the session so the UI can resolve it from the workout
    try {
      await base44.entities.WorkoutSession.update(workout_id, { post_workout_feedback_id: feedbackRecord.id });
    } catch (linkErr) {
      console.warn('Failed to link feedback to session:', linkErr);
    }

    return new Response(
      JSON.stringify({ success: !failed, feedback: feedbackRecord, evaluation: coachMsg }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Evaluation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

const MAX_LLM_ATTEMPTS = 2;
const FALLBACK_BACKOFF_MS = 800;

function buildPrompt(workout: any, athlete_id: string) {
  return `Analyze this workout session for athlete ${athlete_id}:
      Sport: ${workout.sport}
      Duration: ${workout.duration_minutes} mins
      Distance: ${workout.distance_km} km
      Avg HR: ${workout.avg_hr} bpm
      Max HR: ${workout.max_hr} bpm
      TRIMP: ${workout.session_trimp}
      Provide a JSON object with:
      - "intensity": one of "easy" | "moderate" | "hard" | "very_hard" (the dominant physiological intensity of the session)
      - "feedback": 2-3 concise coaching takeaways and training guidance as a single string paragraph
      - "highlights": array of 2-4 short bullet strings of the key insights.`;
}

const EVAL_SCHEMA = {
  type: 'object',
  properties: {
    intensity: { type: 'string', enum: ['easy', 'moderate', 'hard', 'very_hard'] },
    feedback: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' } },
  },
  required: ['intensity', 'feedback'],
};

// Invoke the LLM up to MAX_LLM_ATTEMPTS times, with a short linear backoff.
// Throws on final failure; the caller decides whether to persist a failed record.
async function invokeWithRetry(base44: any, workout: any, athlete_id: string): Promise<any> {
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt++) {
    try {
      const res: any = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(workout, athlete_id),
        response_json_schema: EVAL_SCHEMA,
      });
      if (res && (res.feedback || res.intensity)) return res;
      throw new Error('Empty LLM response');
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_LLM_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, FALLBACK_BACKOFF_MS * attempt));
      }
    }
  }
  throw lastErr || new Error('LLM evaluation failed after retries');
}

// Create or update the WorkoutFeedback record for a given workout so retries
// update the same row in place rather than stacking duplicate insight records.
async function upsertFeedback(base44: any, workout_id: string, athlete_id: string, data: any) {
  const existing = await base44.entities.WorkoutFeedback.filter({ workout_id }, '-created_date', 1);
  if (existing[0]) {
    return await base44.entities.WorkoutFeedback.update(existing[0].id, data);
  }
  return await base44.entities.WorkoutFeedback.create({ workout_id, athlete_id, ...data });
}