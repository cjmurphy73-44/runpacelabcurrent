// base44/shared/postWorkoutAI.ts
// Post-workout AI evaluation logic, extracted so both the authed HTTP wrapper
// (client retry) and the external-webhook path (service role, no user) share one
// implementation. Takes a base44 client and runs entity writes + LLM against it.

import { sendAthletePush } from './pushNotifications.ts';

const MAX_LLM_ATTEMPTS = 2;
const FALLBACK_BACKOFF_MS = 800;

const EVAL_SCHEMA = {
  type: 'object',
  properties: {
    intensity: { type: 'string', enum: ['easy', 'moderate', 'hard', 'very_hard'] },
    feedback: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' } },
  },
  required: ['intensity', 'feedback'],
};

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

async function invokeWithRetry(base44: any, workout: any, athlete_id: string): Promise<any> {
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt++) {
    try {
      const res: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: buildPrompt(workout, athlete_id),
        response_json_schema: EVAL_SCHEMA,
      });
      if (res && (res.feedback || res.intensity)) return res;
      throw new Error('Empty LLM response');
    } catch (e: any) {
      lastErr = e;
      if (attempt < MAX_LLM_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, FALLBACK_BACKOFF_MS * attempt));
      }
    }
  }
  throw lastErr || new Error('LLM evaluation failed after retries');
}

async function upsertFeedback(base44: any, workout_id: string, athlete_id: string, data: any) {
  const existing = await base44.asServiceRole.entities.WorkoutFeedback.filter({ workout_id }, '-created_date', 1);
  if (existing[0]) {
    return await base44.asServiceRole.entities.WorkoutFeedback.update(existing[0].id, data);
  }
  return await base44.asServiceRole.entities.WorkoutFeedback.create({ workout_id, athlete_id, ...data });
}

export async function runPostWorkoutEvaluation(base44: any, workout_id: string, athlete_id: string) {
  const workout = await base44.asServiceRole.entities.WorkoutSession.get(workout_id);

  let feedbackRecord: any;
  let coachMsg: any = null;
  let failed = false;

  try {
    const aiEvaluation: any = await invokeWithRetry(base44, workout, athlete_id);
    const feedbackText = aiEvaluation?.feedback ? aiEvaluation.feedback : String(aiEvaluation);
    const intensity = aiEvaluation?.intensity ? aiEvaluation.intensity : 'moderate';
    const highlights = Array.isArray(aiEvaluation?.highlights) ? aiEvaluation.highlights : [];

    coachMsg = await base44.asServiceRole.entities.CoachMessage.create({
      athlete_id,
      message_type: 'performance_summary',
      content_text: feedbackText,
      triggered_by_workout_session_id: workout_id,
    });

    feedbackRecord = await upsertFeedback(base44, workout_id, athlete_id, {
      feedback: feedbackText,
      status: 'complete',
      intensity,
      highlights,
    });
  } catch (evalErr: any) {
    failed = true;
    console.warn('postWorkoutAIEvaluation LLM failed after retry:', evalErr?.message);
    feedbackRecord = await upsertFeedback(base44, workout_id, athlete_id, {
      feedback: "The AI coach couldn't analyse this session this time. Tap retry to try again.",
      status: 'failed',
      intensity: 'moderate',
      highlights: [] as string[],
    });
  }

  try {
    await base44.asServiceRole.entities.WorkoutSession.update(workout_id, { post_workout_feedback_id: feedbackRecord.id });
  } catch (linkErr) {
    console.warn('Failed to link feedback to session:', linkErr);
  }

  if (!failed) {
    await sendAthletePush(base44, athlete_id, {
      title: 'New coach insight',
      content: 'Your post-workout AI evaluation is ready to review.',
      action_label: 'View insight',
      action_url: `/activity/${workout_id}`,
    }).catch((e: any) => console.warn('postWorkoutAIEvaluation push failed:', e?.message));
  }

  return { success: !failed, feedback: feedbackRecord, evaluation: coachMsg };
}