import type { RecoveryBaseline, RecoverySignals } from './readiness.ts';

const positive = (value?: number | null) => typeof value === 'number' && Number.isFinite(value) && value > 0;
const percentage = (value?: number | null) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;

export function countRecoverySignals(signals: RecoverySignals, baseline: RecoveryBaseline): number {
  return [
    positive(signals.hrv) && positive(baseline.hrv),
    positive(signals.resting_hr) && positive(baseline.resting_hr),
    percentage(signals.sleep_score) || positive(signals.sleep_duration_hours),
    percentage(signals.body_battery),
    percentage(signals.stress_score),
  ].filter(Boolean).length;
}
