import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getAuthorizedAthlete, isRecordId } from '../../shared/ownership.ts';
import { assertPaidPlan } from '../../shared/planGate.ts';
import { claimRateLimit } from '../../shared/rateLimit.ts';
import { validateAdjustments } from '../../shared/planValidation.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_id, current_tsb } = (await req.json().catch(() => null)) ?? {};
    if (!isRecordId(athlete_id)) return Response.json({ error: 'athlete_id is required' }, { status: 400 });

    const athlete = await getAuthorizedAthlete(base44, user, athlete_id);
    if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

    const gate = await assertPaidPlan(base44, user);
    if (!gate.ok) return Response.json({ error: 'Micro-adjustments require a Pro plan.', plan: gate.plan }, { status: 402 });

    const today = new Date().toISOString().slice(0, 10);
    const pending = await base44.asServiceRole.entities.TrainingPlanSession.filter({ athlete_id, status: 'pending' });
    const upcoming = pending
      .filter((s) => s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);

    if (upcoming.length === 0) {
      return Response.json({ success: true, message: 'No upcoming pending sessions to adjust', adjusted: [] });
    }

    const tsb = typeof current_tsb === 'number' ? current_tsb : (athlete.current_tsb || 0);

    const recentBiometrics = (await base44.asServiceRole.entities.BiometricTelemetry.filter({ athlete_id: athlete_id }, '-date', 3))
      .map((b) => ({ date: b.date, hrv_ms: b.hrv_ms, sleep_score: b.sleep_score }));

    if (!claimRateLimit(`micro-adjustment:${user.id}`, 10, 60 * 60_000)) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Athlete's current Training Stress Balance (TSB/Form) is ${tsb}. Here are the next ${upcoming.length} prescribed training sessions: ${JSON.stringify(upcoming.map((s) => ({ id: s.id, date: s.date, sport: s.sport, duration: s.prescribed_duration_minutes, zone: s.prescribed_intensity_zone })))}. Here is the athlete's past 3 days of recovery telemetry (most recent first): ${JSON.stringify(recentBiometrics)}. If TSB is very negative (below -20), the athlete is overly fatigued: reduce duration and/or intensity zone for these sessions. If TSB is strongly positive (above +25), the athlete is very fresh and can hold or slightly increase load. Otherwise keep sessions mostly unchanged. IMPORTANT SAFETY OVERRIDE: if recent HRV is notably depressed compared to other days in this telemetry, or sleep_score falls below 60, you MUST downscale any planned high-intensity (Z4/Z5) sessions in the next 3 days to low-intensity active recovery (Z1/Z2), reduce duration accordingly, and write a rationale that explicitly cites the low HRV/sleep as the physiological reason for the override. Return an adjustment for every session id listed.`,
      response_json_schema: {
        type: 'object',
        properties: {
          adjustments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                new_duration_minutes: { type: 'number' },
                new_intensity_zone: { type: 'string' },
                rationale: { type: 'string' },
              },
              required: ['id', 'new_duration_minutes', 'rationale'],
            },
          },
          summary: { type: 'string' },
        },
        required: ['adjustments', 'summary'],
      },
    });

    // Validate every adjustment against the supplied upcoming sessions before
    // applying. Only adjustments targeting a known upcoming session id, with
    // in-bounds values, are accepted, nothing partial is persisted.
    const validation = validateAdjustments(llmResult.adjustments || [], upcoming);
    if (validation.accepted.length === 0) {
      return Response.json({ success: true, adjusted: [], rejected: validation.rejected, summary: 'No valid adjustments to apply.' });
    }

    // Legacy micro-adjustment route is preview-only. A coach or LLM must
    // never mutate an athlete's schedule without explicit approval.
    // Approved writes are handled exclusively by approvedPlanAdjustment.
    return Response.json({
      success: true, requires_athlete_approval: true, applied: false,
      proposed: validation.accepted, rejected: validation.rejected,
      message: 'Preview only. Confirm an evidence-based proposal through the athlete-owned plan screen.',
    });
  } catch (error) {
    return Response.json({ error: 'Request could not be completed' }, { status: 500 });
  }
});
