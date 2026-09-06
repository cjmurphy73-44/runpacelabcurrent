export type RiskZone = 'Green' | 'Yellow' | 'Red';

export interface DailyMetrics {
  load: number;
}

export function calculateACWR(history: DailyMetrics[]): { acwr: number; zone: RiskZone } {
  if (history.length < 14) return { acwr: 0, zone: 'Green' };

  const acuteWindow = history.slice(-7);
  const chronicWindow = history.slice(-28);

  const acuteLoad = acuteWindow.reduce((acc, curr) => acc + (curr.load || 0), 0) / 7;
  const chronicLoad = chronicWindow.reduce((acc, curr) => acc + (curr.load || 0), 0) / 28;

  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

  let zone: RiskZone = 'Green';
  if (acwr > 1.5) zone = 'Red';
  else if (acwr > 1.2) zone = 'Yellow';

  return { acwr, zone };
}
