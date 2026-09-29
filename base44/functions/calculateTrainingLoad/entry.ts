// base44/functions/calculateTrainingLoad/entry.ts
import { Base44, Base44FunctionContext } from "@base44/cloud";

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

export default async function (
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
