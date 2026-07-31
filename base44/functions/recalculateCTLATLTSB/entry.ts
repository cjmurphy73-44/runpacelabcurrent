// base44/functions/recalculateCTLATLTSB/entry.ts
// Updated to dynamically apply time constants based on the athlete's training_tier_preference

export async function recalculateCTLATLTSB(params: { athlete_id: string }) {
export default async function(req: Request) {
  const params = await req.json();
  // 1. Fetch athlete profile to get training tier preference
  const athlete = await base44.entities.AthleteProfile.get(params.athlete_id);
  
  let timeConstantCTL = 42; // default moderate
  let timeConstantATL = 7;  // default moderate

  if (athlete && athlete.training_tier_preference) {
    switch (athlete.training_tier_preference.toLowerCase()) {
      case 'conservative':
        // Example custom conservative time constants (e.g. slower decay/shorter response)
        timeConstantCTL = 10;
        timeConstantATL = 12;
        break;
      case 'aggressive':
        // Example aggressive time constants
        timeConstantCTL = 28;
        timeConstantATL = 5;
        break;
      case 'moderate':
      default:
        timeConstantCTL = 42;
        timeConstantATL = 7;
        break;
    }
  }

  const ctlAlpha = 2 / (timeConstantCTL + 1);
  const atlAlpha = 2 / (timeConstantATL + 1);

  // 2. Fetch workout sessions or daily training loads sorted by date
  const sessions = await base44.entities.WorkoutSession.filter(
    { athlete_id: params.athlete_id },
    { sort: 'date:asc' }
  );

  let currentCTL = 0;
  let currentATL = 0;

  for (const session of sessions) {
    const trimp = session.trimp || 0;
    
    // Exponentially Weighted Moving Average (EWMA) formula
    currentCTL = currentCTL + ctlAlpha * (trimp - currentCTL);
    currentATL = currentATL + atlAlpha * (trimp - currentATL);
    const tsb = currentCTL - currentATL;

    // Save or update calculated metrics for the day/session
    await base44.entities.FitnessMetric.upsert({
      athlete_id: params.athlete_id,
      date: session.date,
      ctl: Math.round(currentCTL * 10) / 10,
      atl: Math.round(currentATL * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
    });
  }

  return { success: true, ctl: currentCTL, atl: currentATL };
  return new Response(JSON.stringify({ success: true, ctl: currentCTL, atl: currentATL }), {
    headers: { "Content-Type": "application/json" },
  });
}

