// base44/shared/postWorkoutAI.ts
// Post-workout AI evaluation logic, extracted so both the authed HTTP wrapper
// (client retry) and the external-webhook path (service role, no user) share one
// implementation. Takes a base44 client and runs entity writes + LLM against it.

import { sendAthletePush } from './pushNotifications.ts';
import { buildAthleteStateSummary } from './athleteState.ts';
import { claimRateLimit } from './rateLimit.ts';

const MAX_LLM_ATTEMPTS = 2;
const FALLBACK_BACKOFF_MS = 800;
const activeEvaluations = new Map<string, ReturnType<typeof evaluateWorkout>>();

const EVAL_SCHEMA = {
  type: 'object',
  properties: {
    intensity: { type: 'string', enum: ['easy', 'moderate', 'hard', 'very_hard'] },
    feedback: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' } },
  },
  required: ['intensity', 'feedback'],
};

function buildPrompt(workout: any, stateSummary: any) {
  const { athlete_id: _athleteId, ...trainingState } = stateSummary ?? {};
  const stateBlock = stateSummary
    ? `\nDeterministic training state, computed in code. Use its provenance and gaps. Do not recompute or contradict it.\n${JSON.stringify(trainingState)}\n`
    : '';
  const loadBasis = workout.load_source === 'stream'
    ? `integrated from recorded heart-rate samples (${workout.load_coverage_pct ?? 'unknown'}% coverage)`
    : workout.session_trimp > 0 ? 'estimated from the session average heart rate'
    : 'heart-rate load unavailable';
  return `Analyze this workout session:
      Sport: ${workout.sport}
      Duration: ${workout.duration_minutes} mins
      Distance: ${workout.distance_km} km
      Avg HR: ${workout.avg_hr} bpm
      Max HR: ${workout.max_hr} bpm
      TRIMP: ${workout.session_trimp}
      Load provenance: ${loadBasis}
      ${stateBlock}
      Provide a JSON object with:
      - "intensity": one of "easy" | "moderate" | "hard" | "very_hard" (the dominant physiological intensity of the session)
      - "feedback": 2-3 concise coaching takeaways and training guidance as a single string paragraph
      - "highlights": array of 2-4 short bullet strings of the key insights.`;
}

async function invokeWithRetry(
  base44: any,
  workout: any,
  stateSummary: any,
): Promise<any> {
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt++) {
    try {
      const res: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: buildPrompt(workout, stateSummary),
        response_json_schema: EVAL_SCHEMA,
      });
      if (typeof res?.feedback === 'string' && res.feedback.trim()) return res;
      throw new Error('Empty LLM response');
    } catch (e: any) {
      lastErr = e;
      const status = e?.response?.status ?? e?.status;
      if (status >= 400 && status < 500 && status !== 408) break;
      if (attempt < MAX_LLM_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, FALLBACK_BACKOFF_MS * attempt));
      }
    }
  }
  throw lastErr || new Error('LLM evaluation failed after retries');
}

async function persistFeedback(base44: any, existing: any, workout_id: string, athlete_id: string, data: any) {
  if (existing) {
    return await base44.asServiceRole.entities.WorkoutFeedback.update(existing.id, data);
  }
  return await base44.asServiceRole.entities.WorkoutFeedback.create({ workout_id, athlete_id, ...data });
}

export function runPostWorkoutEvaluation(base44: any, workout_id: string, athlete_id: string) {
  const key = JSON.stringify([athlete_id, workout_id]);
  const current = activeEvaluations.get(key);
  if (current) return current;
  const evaluation = evaluateWorkout(base44, workout_id, athlete_id).finally(() => activeEvaluations.delete(key));
  activeEvaluations.set(key, evaluation);
  return evaluation;
}

async function evaluateWorkout(base44: any, workout_id: string, athlete_id: string) {
  const workout = await base44.asServiceRole.entities.WorkoutSession.get(workout_id);
  if (!workout || workout.athlete_id !== athlete_id) throw new Error('Workout not found for this athlete');
  const feedbackStore = base44.asServiceRole.entities.WorkoutFeedback;
  const scope = { workout_id, athlete_id };
  // Reuse existing feedback before loading training history or calling the model.
  const [existing] = await feedbackStore.filter(scope, '-created_date', 1);
  if (existing?.status === 'complete' && existing.feedback) {
    return { success: true, feedback: existing, evaluation: null };
  }
  if (!claimRateLimit(`post-workout-ai:${athlete_id}`, 8, 10 * 60_000)) {
    throw Object.assign(new Error('Too many new insight requests. Try again in a few minutes.'), { status: 429 });
  }

  // Deterministic math first, prose second: every caller (upload, COROS, Garmin)
  // gets the same structured state in the prompt without wiring it individually.
  let stateSummary: any = null;
  try {
    stateSummary = await buildAthleteStateSummary(base44, workout);
  } catch (stateErr: any) {
    console.warn('AthleteStateSummary unavailable:', stateErr?.message);
  }

  let data: any;
  try {
    const aiEvaluation: any = await invokeWithRetry(base44, workout, stateSummary);
    data = {
      feedback: aiEvaluation.feedback.trim(),
      status: 'complete',
      intensity: EVAL_SCHEMA.properties.intensity.enum.includes(aiEvaluation.intensity) ? aiEvaluation.intensity : 'moderate',
      highlights: Array.isArray(aiEvaluation.highlights) ? aiEvaluation.highlights.filter(h => typeof h === 'string').slice(0, 4) : [],
    };
  } catch (evalErr: any) {
    console.warn('postWorkoutAIEvaluation model unavailable:', evalErr?.status ?? evalErr?.response?.status ?? 'unknown');
    data = {
      feedback: "The AI coach couldn't analyse this session this time. Tap retry to try again.",
      status: 'failed',
      intensity: 'moderate',
      highlights: [] as string[],
    };
  }
  // A different worker may have completed the same job during model generation.
  // This check reduces duplicate writes and keeps a late failure from replacing a success.
  const [latest] = await feedbackStore.filter(scope, '-created_date', 1);
  if (latest?.status === 'complete' && latest.feedback) {
    return { success: true, feedback: latest, evaluation: null };
  }
  const feedbackRecord = await persistFeedback(base44, latest ?? existing, workout_id, athlete_id, data);
  const failed = data.status === 'failed';
  let coachMsg = null;

  try {
    await base44.asServiceRole.entities.WorkoutSession.update(workout_id, { post_workout_feedback_id: feedbackRecord.id });
  } catch (linkErr) {
    console.warn('Failed to link feedback to session:', linkErr);
  }

  if (!failed) {
    coachMsg = await base44.asServiceRole.entities.CoachMessage.create({
      athlete_id,
      message_type: 'performance_summary',
      content_text: feedbackRecord.feedback,
      triggered_by_workout_session_id: workout_id,
    }).catch((error: any) => {
      console.warn('postWorkoutAIEvaluation coach message could not be saved:', error?.status ?? 'unknown');
      return null;
    });
    await sendAthletePush(base44, athlete_id, {
      title: 'New coach insight',
      content: 'Your post-workout AI evaluation is ready to review.',
      action_label: 'View insight',
      action_url: `/workouts/${workout_id}`,
    }).catch((e: any) => console.warn('postWorkoutAIEvaluation push failed:', e?.message));
  }

  return { success: !failed, feedback: feedbackRecord, evaluation: coachMsg };
}
