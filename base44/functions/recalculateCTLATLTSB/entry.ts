// base44/functions/recalculateCTLATLTSB/entry.ts
// Updated to dynamically apply time constants based on the athlete's training_tier_preference

export default async function(req: Request) {
  const params = await req.json();
  const { athlete_id } = params;

  if (!athlete_id) {
    return new Response(JSON.stringify({ error: "Missing athlete_id" }), { status: 400 });
  }

  // 1. Guard Clause: Fetch athlete profile
  // Using try/catch to handle potential missing base44 SDK or entity issues
  let athlete;
  try {
    athlete = await base44.entities.AthleteProfile.get(athlete_id);
  } catch (e) {
    console.error("Failed to fetch athlete profile", e);
    return new Response(JSON.stringify({ success: false, reason: "Athlete not found" }), { status: 404 });
  }

  let timeConstantCTL = 42; 
  let timeConstantATL = 7;  

  if (athlete && athlete.training_tier_preference) {
    switch (athlete.training_tier_preference.toLowerCase()) {
      case 'conservative':
        timeConstantCTL = 10;
        timeConstantATL = 12;
        break;
      case 'aggressive':
        timeConstantCTL = 28;
        timeConstantATL = 5;
        break;
      default:
        timeConstantCTL = 42;
        timeConstantATL = 7;
        break;
    }
  }

  const ctlAlpha = 2 / (timeConstantCTL + 1);
  const atlAlpha = 2 / (timeConstantATL + 1);

  // 2. Fetch workout sessions sorted by date
  let sessions = [];
  try {
    sessions = await base44.entities.WorkoutSession.filter(
      { athlete_id: athlete_id },
      { sort: 'date:asc' }
    );
  } catch (e) {
    console.error("Failed to fetch workout sessions", e);
    return new Response(JSON.stringify({ success: false, reason: "No workout data" }), { status: 200 });
  }

  if (!sessions || sessions.length === 0) {
    return new Response(JSON.stringify({ success: true, message: "No sessions to calculate" }), { status: 200 });
  }

  let currentCTL: number | null = null;
  let currentATL: number | null = null;

  for (const session of sessions) {
    const trimp = session.trimp || 0;
    
    // 3. Perform calculation with explicit NaN handling
    const sessionTrimp = typeof trimp === 'number' && !isNaN(trimp) ? trimp : 0;
    
    // For the first session, initialize CTL and ATL to the TRIMP
    if (currentCTL === null || currentATL === null) {
      currentCTL = sessionTrimp;
      currentATL = sessionTrimp;
    } else {
      const deltaCTL = sessionTrimp - currentCTL;
      const deltaATL = sessionTrimp - currentATL;
      currentCTL = isNaN(deltaCTL) ? currentCTL : currentCTL + ctlAlpha * deltaCTL;
      currentATL = isNaN(deltaATL) ? currentATL : currentATL + atlAlpha * deltaATL;
    }
    const tsb = currentCTL - currentATL;

    // 4. Robust Upsert: Ensure FitnessMetric exists before writing
    try {
      await base44.entities.FitnessMetric.upsert({
        athlete_id: athlete_id,
        date: session.date,
        ctl: isNaN(currentCTL) ? 0 : Math.round(currentCTL * 10) / 10,
        atl: isNaN(currentATL) ? 0 : Math.round(currentATL * 10) / 10,
        tsb: isNaN(tsb) ? 0 : Math.round(tsb * 10) / 10,
      });
    } catch (e) {
      console.warn("Failed to upsert FitnessMetric for date:", session.date, e);
      // Continue processing other sessions even if one fails
    }
  }

  return new Response(JSON.stringify({ success: true, ctl: currentCTL, atl: currentATL }), {
    headers: { "Content-Type": "application/json" },
  });
}
