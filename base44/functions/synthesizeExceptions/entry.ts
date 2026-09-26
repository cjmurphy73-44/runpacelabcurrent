// base44/functions/synthesizeExceptions/entry.ts
// Exception-based AI synthesis. Reads the reconciled daily timeline (DailyMetrics +
// recent workouts + sparse LabResults) for the caller's athlete, runs the shared
// anomaly detector, then asks the LLM for a single concise daily synthesis that
// surfaces the dominant exception + one actionable cue. Pro-plan gated + per-worker
// rate limited. Returns { anomalies, synthesisText, confidence, asOf }.
//
// Invoke from the frontend via base44.functions.invoke('synthesizeExceptions', { athlete_id }).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { assertPaidPlan } from '../../shared/planGate.ts';
import { claimRateLimit } from '../../shared/rateLimit.ts';
import { detectAnomalies } from '../../shared/anomalyDetect.ts';
import { reportError } from '../../shared/errorReport.ts';

const SYNTHESIS_SCHEMA = {
  type: 'object',
  properties: {
    synthesisText: { type: 'string', description: '2-3 sentence daily synthesis surfacing the dominant exception and one actionable cue.' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['synthesisText'],
};

function buildSummary(latest, workouts, labs, anomalies) {
  const m = latest || {};
  const parts = [];
  parts.push(`Fitness (CTL): ${typeof m.calculated_ctl === 'number' ? Math.round(m.calculated_ctl) : 'unknown'}`);
  parts.push(`Fatigue (ATL): ${typeof m.calculated_atl === 'number' ? Math.round(m.calculated_atl) : 'unknown'}`);
  parts.push(`Form (TSB): ${typeof m.calculated_tsb === 'number' ? Math.round(m.calculated_tsb) : 'unknown'}`);
  parts.push(`Readiness: ${typeof m.readiness_score === 'number' ? m.readiness_score : 'unknown'}`);
  parts.push(`HRV: ${typeof m.hrv === 'number' ? Math.round(m.hrv) + 'ms' : 'unknown'}`);
  parts.push(`Sleep score: ${typeof m.sleep_score === 'number' ? m.sleep_score : 'unknown'}`);
  parts.push(`Resting HR: ${typeof m.resting_hr === 'number' ? m.resting_hr + 'bpm' : 'unknown'}`);
  const recentSessions = (workouts || []).slice(0, 7).map((w) => `${w.date||'?'} ${w.sport||'?'} ${w.duration_minutes||0}min ${w.distance_km||0}km trimp=${w.session_trimp||0}`).join(' | ');
  parts.push(`Recent sessions: ${recentSessions || 'none'}`);
  const labSummary = (labs || []).slice(0, 6).map((l) => `${l.date} ${l.metric_name}=${l.value}${l.unit||''}`).join(' | ');
  parts.push(`Lab results: ${labSummary || 'none'}`);
  const flags = anomalies.map((a) => `${a.severity.toUpperCase()}: ${a.title} — ${a.detail}`).join(' | ');
  parts.push(`Detected anomalies: ${flags || 'none'}`);
  return parts.join('\n');
}

export default async function(req) {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Plan gate. Return a 200 with a flag so the frontend hook can render an upgrade
    // prompt without parsing a thrown error response.
    const { ok } = await assertPaidPlan(base44, user);
    if (!ok) return Response.json({ gated: true, error: 'Pro plan required for AI synthesis' });

    // Per-worker rate limit: 20 synthesis calls per user per day.
    if (!claimRateLimit(`synth:${user.id}`, 20, 24 * 3600 * 1000)) {
      return Response.json({ rateLimited: true, error: 'Daily AI synthesis limit reached' });
    }

    const body = await req.json().catch(() => ({}));
    const athleteId = body.athlete_id;
    if (!athleteId) return Response.json({ error: 'athlete_id required' }, { status: 400 });

    const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athleteId).catch(() => null);
    if (!athlete) return Response.json({ error: 'Athlete not found' }, { status: 404 });
    if (athlete.created_by_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [metrics, workouts, labs] = await Promise.all([
      base44.asServiceRole.entities.DailyMetrics.filter({ athlete_id: athleteId }, '-date', 30),
      base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: athleteId }, '-date', 21),
      base44.asServiceRole.entities.LabResult.filter({ athlete_id: athleteId }, '-date', 20),
    ]);

    const anomalies = detectAnomalies(metrics, workouts, athlete);

    // Not enough data to synthesize meaningfully.
    if (!metrics.length && !workouts.length) {
      return Response.json({ anomalies: [], synthesisText: '', confidence: 'low', asOf: new Date().toISOString(), empty: true });
    }

    const summary = buildSummary(metrics[0], workouts, labs, anomalies);
    const prompt = `You are an elite endurance-coaching intelligence. Given the reconciled daily telemetry summary below, write ONE concise daily synthesis (2-3 sentences, second person, plain language) that surfaces the single dominant exception or trend and gives one actionable cue for today. Use only the data provided; do not invent numbers. If everything is stable, say so briefly.\n\n${summary}`;

    let synthesisText = '';
    let confidence = anomalies.length ? 'medium' : 'high';
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: SYNTHESIS_SCHEMA,
      });
      if (res && typeof res === 'object') {
        synthesisText = res.synthesisText || '';
        if (res.confidence) confidence = res.confidence;
      } else if (typeof res === 'string') {
        synthesisText = res;
      }
    } catch (e) {
      console.warn('synthesizeExceptions LLM failed:', e?.message);
      // Fall back to a rule-based synthesis so the card still renders.
      if (anomalies.length) {
        const top = anomalies[0];
        synthesisText = `${top.title}. ${top.cue || top.detail}`;
        confidence = top.severity === 'danger' ? 'low' : 'medium';
      } else {
        synthesisText = 'Your recovery and load signals are within stable ranges — keep the routine and watch for any sharp change tomorrow.';
        confidence = 'high';
      }
    }

    return Response.json({ anomalies, synthesisText, confidence, asOf: new Date().toISOString() });
  } catch (error) {
    try { if (base44) await reportError(base44, { source: 'synthesizeExceptions', message: error.message, stack: error.stack, severity: 'Medium' }); } catch (e) { console.warn('reportError failed:', e); }
    return Response.json({ error: error.message }, { status: 500 });
  }
}