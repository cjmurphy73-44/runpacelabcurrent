// src/science/injury.ts
// Acute:Chronic Workload Ratio (ACWR) — a load-spike indicator.
//
// Source first published as: Gabbett, T.J. 2016. "The training-injury prevention
// paradox." Br J Sports Med. Acute = 7-day load mean; chronic = 28-day load mean.
//
// IMPORTANT — STATISTICAL CAVEAT (Impellizzeri et al. 2020, BJSM):
//  ACWR is a *mathematical artifact of the same dataset* and its predictive
//  power for injury is not supported by appropriately controlled studies. The
//  bands below flag load spikes for *review*, NOT injury causation. Do not
//  present this as "injury risk" without the correlational-not-causal disclaimer.
//
// Bands (advisory, not diagnostic):
//   <= 1.20  Green
//   1.20–1.50 Yellow
//   >  1.50  Red

export type RiskZone = 'Green' | 'Yellow' | 'Red';

export interface DailyLoad {
  load: number;
}

export function calculateACWR(history: DailyLoad[]): { acwr: number; zone: RiskZone } {
  if (history.length < 14) return { acwr: 0, zone: 'Green' };
  const acuteWindow = history.slice(-7);
  const chronicWindow = history.slice(-28);
  const acuteLoad = acuteWindow.reduce((acc, c) => acc + c.load, 0) / 7;
  const chronicLoad = chronicWindow.reduce((acc, c) => acc + c.load, 0) / chronicWindow.length;
  const acwr = chronicLoad === 0 ? 0 : acuteLoad / chronicLoad;
  let zone: RiskZone = 'Green';
  if (acwr > 1.5) zone = 'Red';
  else if (acwr > 1.2) zone = 'Yellow';
  return { acwr, zone };
}