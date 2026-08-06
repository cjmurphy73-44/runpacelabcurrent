import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_id, race_goals, long_term_goal } = await req.json();
    if (!athlete_id) return Response.json({ error: 'athlete_id is required' }, { status: 400 });

    const athlete = await base44.entities.AthleteProfile.get(athlete_id);
    if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

    const recentSessions = await base44.entities.WorkoutSession.filter({ athlete_id }, '-date', 500);
    // Baseline-test enrichment is optional — the PhysiologicalBaselines entity may not be configured
    // for this app, so a missing schema shouldn't fail the whole plan generation.
    let latestBaseline = null;
    try {
      const baselines = await base44.entities.PhysiologicalBaselines.filter({ athlete_id }, '-recorded_date', 1);
      latestBaseline = baselines[0] || null;
    } catch (_e) {
      latestBaseline = null;
    }

    const totalSessions = recentSessions.length;
    const totalKm = recentSessions.reduce((sum, s) => sum + (s.distance_km || 0), 0);
    const oldestDate = totalSessions > 0 ? recentSessions[recentSessions.length - 1].date : null;
    const weeksOfData = oldestDate ? Math.max(1, Math.round((Date.now() - new Date(oldestDate).getTime()) / (7 * 86400000))) : 0;

    const goals = Array.isArray(race_goals) ? race_goals.filter((g) => g && g.date) : [];
    const sortedGoals = [...goals].sort((a, b) => a.date.localeCompare(b.date));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const toDateStr = (d) => d.toISOString().slice(0, 10);

    let totalWeeks = 8;
    if (sortedGoals.length > 0) {
      const lastGoalDate = new Date(sortedGoals[sortedGoals.length - 1].date);
      const diffDays = Math.ceil((lastGoalDate.getTime() - today.getTime()) / 86400000);
      totalWeeks = Math.ceil(diffDays / 7);
    }
    const cappedWeeks = Math.max(4, Math.min(totalWeeks, 6));
    const needsPhase2Note = totalWeeks > cappedWeeks;

    const weekDates = [];
    for (let w = 0; w < cappedWeeks; w++) {
      const weekStart = new Date(today.getTime() + w * 7 * 86400000);
      const days = [];
      for (let d = 0; d < 7; d++) {
        days.push(toDateStr(new Date(weekStart.getTime() + d * 86400000)));
      }
      weekDates.push({ week_number: w + 1, start_date: days[0], end_date: days[6], days });
    }

    const tierKey = athlete.training_tier_preference === 'moderate' ? 'intermediate' : (athlete.training_tier_preference || 'conservative');

    const prompt = `You are an elite sports scientist and running/endurance coach, writing a race-anchored, physiologically-grounded training plan of exceptional technical depth — comparable to a plan written by a human exercise physiologist who has studied the athlete's full training history. Be specific and concrete everywhere: real heart-rate ranges, real paces, real durations. Never write vague filler like "run easy" without a number attached.

ATHLETE PROFILE:
- Name: ${athlete.first_name} ${athlete.last_name}
- Age/Sex: ${athlete.age || 'unknown'} / ${athlete.sex || 'unknown'}
- Max HR: ${athlete.max_heart_rate || 'unknown'} bpm
- Resting HR: ${athlete.resting_hr || 'unknown'} bpm
- Lactate Threshold HR: ${athlete.lactate_threshold_hr || 'unknown'} bpm
- VDOT estimate: ${athlete.vdot_estimate || 'unknown'}
- FTP: ${athlete.ftp_watts || 'unknown'} watts
- Current CTL (Fitness): ${athlete.current_ctl || 0}
- Current ATL (Fatigue): ${athlete.current_atl || 0}
- Current TSB (Form): ${athlete.current_tsb || 0}
- Training tier: ${tierKey}
- Injury history: ${athlete.injury_history || 'none reported'}
${latestBaseline ? `- Latest baseline test (${latestBaseline.recorded_date}): VO2Max ${latestBaseline.vo2max_ml_kg_min || 'n/a'} ml/kg/min, FTP ${latestBaseline.functional_threshold_power_watts || 'n/a'}W, LTHR ${latestBaseline.lactate_threshold_hr_bpm || 'n/a'} bpm` : '- No baseline test on file'}
- Training history on file: ${totalSessions} sessions / ${totalKm.toFixed(0)}km / ~${weeksOfData} weeks of data

RACE GOALS (chronological): ${sortedGoals.length > 0 ? JSON.stringify(sortedGoals) : 'None specified — build a general fitness-building block'}
LONG-TERM GOAL: ${long_term_goal || 'Not specified'}

Generate exactly ${cappedWeeks} weeks for the "${tierKey}" tier only, using these EXACT calendar dates (do not invent your own) — one macrocycle row and one weekly_plans entry per week, every day's "date" must be one of the 7 days listed for that week:
${JSON.stringify(weekDates)}

STRUCTURE REQUIRED (keep prose tight — this is a working plan, not an essay):
1. plan_title — descriptive, mentions the primary goal and block length.
2. athlete_summary — 3-4 sentences synthesizing VDOT/HR zones/CTL-ATL-TSB/injury context into a physiological narrative.
3. goal_architecture — for each key race distance/metric, current value + a milestone per race goal.
4. pace_zones — Z1 Recovery through Z5 VO2max (+ rep pace if relevant), each with pace range, HR range, purpose, derived from THIS athlete's own LT1/LT2/VDOT/max HR.
5. prehab_routine — a daily 8-10 minute injury-prevention routine targeting the athlete's injury_history (if none, a sensible general running prehab routine). Brief "why" for each exercise.
6. macrocycle — one row per week: phase name, key session, deload flag (deload before/after race weeks and periodically).
7. weekly_plans — one entry per week: theme, totals (one string e.g. "~55km / ~5h30 / ~320 TSS"), and all 7 days filled using the exact dates given. Each day: session_type, sport, title, prescribed_duration_minutes, prescribed_intensity_zone (e.g. "Z2","Z4","Rest"), and a concise description with concrete HR/pace targets and structure (warm-up/main/cool-down). Taper weeks reduce volume ~30-40%. Race weeks include race-week scheduling and a short race-day pacing strategy in that day's description.
8. nutrition_system — fueling by session type (before/during/after) with CHO/protein grams where relevant.
9. hrv_framework — table mapping HRV/resting-HR deviations to specific training adjustments.
10. injury_audit_questions — short weekly self-check checklist tailored to this athlete's injury history.
11. injury_red_flags — symptoms meaning stop immediately and seek assessment.
${needsPhase2Note ? `12. phase2_note — since the true goal horizon (${totalWeeks} weeks) extends beyond this ${cappedWeeks}-week block, a short narrative on what comes next and that it will be recalibrated after this block's race result.` : '12. phase2_note — empty string, this plan already covers the full goal horizon.'}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          plan_title: { type: 'string' },
          athlete_summary: { type: 'string' },
          goal_architecture: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                metric: { type: 'string' },
                current_value: { type: 'string' },
                milestones: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, target: { type: 'string' } } } },
              },
            },
          },
          pace_zones: {
            type: 'array',
            items: { type: 'object', properties: { zone: { type: 'string' }, pace_range: { type: 'string' }, hr_range: { type: 'string' }, purpose: { type: 'string' } } },
          },
          prehab_routine: {
            type: 'array',
            items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } },
          },
          macrocycle: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                week_number: { type: 'integer' },
                start_date: { type: 'string' },
                end_date: { type: 'string' },
                phase: { type: 'string' },
                key_session: { type: 'string' },
                deload: { type: 'boolean' },
              },
            },
          },
          weekly_plans: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                week_number: { type: 'integer' },
                start_date: { type: 'string' },
                theme: { type: 'string' },
                totals: { type: 'string' },
                days: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      day_name: { type: 'string' },
                      session_type: { type: 'string' },
                      sport: { type: 'string' },
                      title: { type: 'string' },
                      prescribed_duration_minutes: { type: 'number' },
                      prescribed_intensity_zone: { type: 'string' },
                      description: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          nutrition_system: {
            type: 'array',
            items: { type: 'object', properties: { session_type: { type: 'string' }, before: { type: 'string' }, during: { type: 'string' }, after: { type: 'string' } } },
          },
          hrv_framework: {
            type: 'array',
            items: { type: 'object', properties: { condition: { type: 'string' }, action: { type: 'string' } } },
          },
          injury_audit_questions: { type: 'array', items: { type: 'string' } },
          injury_red_flags: { type: 'array', items: { type: 'string' } },
          phase2_note: { type: 'string' },
        },
        required: ['plan_title', 'athlete_summary', 'weekly_plans', 'macrocycle'],
      },
    });

    // Discard any prior undecided draft for this athlete before staging the new one
    const oldDrafts = await base44.entities.TrainingPlan.filter({ athlete_id, status: 'draft' });
    if (oldDrafts.length > 0) {
      await Promise.all(oldDrafts.map((p) => base44.entities.TrainingPlan.delete(p.id)));
    }

    const lastWeek = weekDates[weekDates.length - 1];
    const newPlan = await base44.entities.TrainingPlan.create({
      athlete_id,
      status: 'draft',
      start_date: weekDates[0].start_date,
      end_date: lastWeek.end_date,
      plan_title: result.plan_title,
      tier: tierKey,
      athlete_summary: result.athlete_summary,
      race_goals: sortedGoals,
      goal_architecture: result.goal_architecture || [],
      pace_zones: result.pace_zones || [],
      prehab_routine: result.prehab_routine || [],
      macrocycle: result.macrocycle || [],
      weekly_plans: result.weekly_plans || [],
      nutrition_system: result.nutrition_system || [],
      hrv_framework: result.hrv_framework || [],
      injury_audit_questions: result.injury_audit_questions || [],
      injury_red_flags: result.injury_red_flags || [],
      phase2_note: result.phase2_note || '',
    });

    // Draft plans are staged only — no TrainingPlanSession rows are created until the
    // athlete reviews the macrocycle and calls commitTrainingPlan to confirm.
    return Response.json({ success: true, training_plan: newPlan });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});