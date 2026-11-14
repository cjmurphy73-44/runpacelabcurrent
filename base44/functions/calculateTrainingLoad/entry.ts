// base44/functions/calculateTrainingLoad/entry.ts
// The legacy @base44/cloud runtime is unsupported in Deno functions.
type Base44 = unknown;
type Base44FunctionContext = unknown;

interface CalculateTrainingLoadArgs {
  dailyTSSHistory?: number[];
  previousCTL?: number;
  previousATL?: number;
  dailyTSS?: number;
  ctlTauDays?: number;
  atlTauDays?: number;
  ctl?: number;
  atl?: number;
}

async function legacyCalculate(
  base44: Base44,
  context: Base44FunctionContext,
  args: CalculateTrainingLoadArgs
) {
  const { dailyTSSHistory, previousCTL = 0, previousATL = 0, dailyTSS, ctlTauDays = 42, atlTauDays = 7, ctl, atl } = args;

  // calculateCTL
  if (dailyTSS !== undefined && previousCTL !== undefined && ctlTauDays !== undefined) {
    const decay = Math.exp(-1 / ctlTauDays);
    const factor = 1 - decay;
    const newCTL = previousCTL * decay + dailyTSS * factor;
    return { ctl: newCTL };
  }

  // calculateATL
  if (dailyTSS !== undefined && previousATL !== undefined && atlTauDays !== undefined) {
    const decay = Math.exp(-1 / atlTauDays);
    const factor = 1 - decay;
    const newATL = previousATL * decay + dailyTSS * factor;
    return { atl: newATL };
  }

  // calculateTSB
  if (ctl !== undefined && atl !== undefined) {
    return { tsb: ctl - atl };
  }

  // calculateEWMA
  if (dailyTSSHistory) {
    let currentCTL = previousCTL;
    let currentATL = previousATL;
    const ctlLambda = 1 - Math.exp(-1 / ctlTauDays);
    const atlLambda = 1 - Math.exp(-1 / atlTauDays);
    for (const tss of dailyTSSHistory) {
      currentCTL = currentCTL + (tss - currentCTL) * ctlLambda;
      currentATL = currentATL + (tss - currentATL) * atlLambda;
    }
    const roundedCTL = Number(currentCTL.toFixed(1));
    const roundedATL = Number(currentATL.toFixed(1));
    return { ctl: roundedCTL, atl: roundedATL, tsb: Number((roundedCTL - roundedATL).toFixed(1)) };
  }

  return { error: "Invalid arguments provided for training load calculation." };
}

// Legacy calculation exports above are retained for review but are not
// exposed until load-unit, date, and input provenance are validated.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  return Response.json({ success: false, code: 'LEGACY_CALCULATION_NOT_VALIDATED',
    error: 'Use the verified science preview. Legacy load calculations are temporarily unavailable.' }, { status: 503 });
});
