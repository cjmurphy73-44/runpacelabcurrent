import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { assertPaidPlan } from '../../shared/planGate.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const gate = await assertPaidPlan(base44, user);
    if (!gate.ok) return Response.json({ error: 'Race strategy requires a Pro plan.', plan: gate.plan }, { status: 402 });

    const { athlete_id, event_type } = await req.json();
    if (!athlete_id || !event_type) return Response.json({ error: 'athlete_id and event_type are required' }, { status: 400 });

    const athlete = await base44.entities.AthleteProfile.get(athlete_id);
    if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

    const baselines = await base44.entities.PhysiologicalBaselines.filter({ athlete_id }, '-recorded_date', 1);
    const latestBaseline = baselines[0] || null;

    // Taper length and emphasis scale with event category — a mile taper is short and sharpening-focused,
    // an ultra taper is long and recovery-focused. This keeps the plan physiologically appropriate to distance.
    const EVENT_TAPER_DAYS = {
      '800m': 7, '1500m': 7, 'Mile': 7,
      '5K': 10, '10K': 10,
      'Half Marathon': 14, 'Marathon': 14,
      '50K Ultra': 21, '100K Ultra': 28, '100 Mile Ultra': 28,
      'Olympic Distance Triathlon': 14, 'Ironman 70.3': 14, 'Ironman (Full)': 21,
      '100km Cycling Gran Fondo': 10,
    };
    const taperDays = EVENT_TAPER_DAYS[event_type] || 14;

    const prompt = `You are an elite sports scientist building a race-week plan for an athlete.

Athlete current state:
- CTL (Fitness): ${athlete.current_ctl || 0}
- ATL (Fatigue): ${athlete.current_atl || 0}
- TSB (Form): ${athlete.current_tsb || 0}
- Lactate Threshold HR: ${athlete.lactate_threshold_hr || 'unknown'} bpm
- FTP: ${athlete.ftp_watts || 'unknown'} watts
- Max HR: ${athlete.max_heart_rate || 'unknown'} bpm
${latestBaseline ? `- Latest baseline test (${latestBaseline.recorded_date}): VO2Max ${latestBaseline.vo2max_ml_kg_min || 'n/a'} ml/kg/min, FTP ${latestBaseline.functional_threshold_power_watts || 'n/a'}W, LTHR ${latestBaseline.lactate_threshold_hr_bpm || 'n/a'} bpm, Resting HR ${latestBaseline.resting_hr_bpm || 'n/a'} bpm` : '- No baseline test on file'}

Target event: ${event_type}

Produce a structured ${taperDays}-day exponential taper plan (day 1 = ${taperDays} days out, day ${taperDays} = race day) appropriate to this event's distance — short track/middle-distance events taper fast with sharpening intensity, road races taper progressively, and ultra-endurance events use a longer, recovery-weighted taper — that progressively reduces training volume while retaining short high-intensity efforts to preserve blood plasma volume and neuromuscular sharpness. Also produce a race-day physiological execution strategy with specific heart rate and/or power caps mapped to this athlete's exact thresholds, including fueling/pacing guidance appropriate to the event's duration (e.g. carb intake per hour for ultras).`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          taper_plan: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day_number: { type: 'integer' },
                days_to_race: { type: 'integer' },
                volume_percent_of_peak: { type: 'number' },
                focus: { type: 'string' },
                notes: { type: 'string' },
              },
            },
          },
          race_day_strategy: { type: 'string' },
        },
      },
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});