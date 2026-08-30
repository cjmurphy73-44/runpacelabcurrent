import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendAthletePush } from '../../shared/pushNotifications.ts';

// C-13 Adaptive Re-planning.
// Fired from the reconciliation hook the moment a planned session is marked
// `skipped`, `partial`, or `excess`. Re-optimizes the remainder of the training
// block: loads the deviation + the athlete's current CTL/ATL/TSB, asks the
// micro-adjustment LLM to re-shape the next upcoming pending sessions, patches
// those TrainingPlanSession rows, and posts a coaching message summarising the
// change so it surfaces on the dashboard feed + toast.
//
// Self-contained (does not call requestMicroadjustment) so it owns the deviation
// context and runs reliably under the user's token from the client invoke.

const DEVIATION_STATUSES = ['skipped', 'partial', 'excess'];

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id } = await req.json();
    if (!session_id) return Response.json({ error: 'session_id is required' }, { status: 400 });

    const session = await base44.entities.TrainingPlanSession.get(session_id);
    if (!session) return Response.json({ error: 'Plan session not found' }, { status: 404 });

    if (!DEVIATION_STATUSES.includes(session.status)) {
      return Response.json({ success: true, skipped: true, reason: 'not a deviation' });
    }

    const athlete = await base44.entities.AthleteProfile.get(session.athlete_id);
    if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

    // Resolve the actual session duration (if a workout was linked) to quantify
    // the delta. For `skipped` there is no linked workout → actual = 0.
    const prescribed = session.prescribed_duration_minutes || 0;
    let actual = 0;
    try {
      const linked = await base44.entities.WorkoutSession.filter({ training_plan_session_id: session.id }, '-date', 1);
      if (linked[0]) actual = linked[0].duration_minutes || 0;
    } catch { /* linked workout optional */ }
    const delta = Math.round(actual - prescribed);

    const tsb = athlete.current_tsb || 0;
    const ctl = athlete.current_ctl || 0;

    const today = new Date().toISOString().slice(0, 10);
    const pending = await base44.entities.TrainingPlanSession.filter({ athlete_id: session.athlete_id, status: 'pending' });
    const upcoming = pending
      .filter((s) => s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);

    if (upcoming.length === 0) {
      return Response.json({ success: true, adjusted: [], summary: 'No upcoming pending sessions to adjust.', deviated_session: session_id });
    }

    const llmResult: any = await base44.integrations.Core.InvokeLLM({
      prompt: `Adaptive re-planning trigger. An athlete's prescribed session deviated from plan and the downstream block must be re-optimised.

Deviation context:
- deviated session: ${session.sport} on ${session.date}, status "${session.status}"
- prescribed ${prescribed} min, actually completed ${actual} min (delta ${delta > 0 ? '+' : ''}${delta} min)

Athlete state:
- Training Stress Balance (TSB/Form): ${tsb}
- Chronic Training Load (CTL/Fitness): ${ctl}

Next ${upcoming.length} upcoming prescribed sessions to re-shape:
${JSON.stringify(upcoming.map((s) => ({ id: s.id, date: s.date, sport: s.sport, duration: s.prescribed_duration_minutes, zone: s.prescribed_intensity_zone })))}

Adaptive rules:
- If the athlete SKIPPED a key session, redistribute that load sensibly across the next sessions — do not simply pile the missed volume onto the very next day.
- If the session was PARTIAL (under-done) and TSB is positive, the next session can stay or slightly increase. If TSB is negative, ease the next session.
- If the session was EXCESS (over-done), pull the next session back to absorb the extra fatigue; reduce intensity before reducing duration.
- Keep changes conservative and physiologically defensible.
Return an adjustment for EVERY session id listed.`,
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

    const updates = (llmResult.adjustments || []).map((a: any) => ({
      id: a.id,
      prescribed_duration_minutes: a.new_duration_minutes,
      prescribed_intensity_zone: a.new_intensity_zone || undefined,
      rationale_text: a.rationale,
      status: 'modified',
    }));

    if (updates.length > 0) await base44.entities.TrainingPlanSession.bulkUpdate(updates);

    const summary: string = llmResult.summary || 'Your coach adjusted the rest of your week.';
    await base44.entities.CoachMessage.create({
      athlete_id: session.athlete_id,
      message_type: 'micro_adjustment',
      content_text: summary,
    });

    // Notify the athlete's mobile device that their plan was auto-adjusted
    // (native builds only — fails silently until push credentials are configured).
    await sendAthletePush(base44, session.athlete_id, {
      title: 'Training plan auto-adjusted',
      content: summary,
      action_label: 'Open plan',
      action_url: '/plan',
    });

    return Response.json({ success: true, adjusted: updates, summary, deviated_session: session_id });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});