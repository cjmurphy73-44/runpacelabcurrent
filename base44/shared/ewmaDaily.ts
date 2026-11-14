// Daily CTL/ATL/TSB contract shared by the backend recompute path.
// Matches src/science/load.ts: zero baseline, exponential time constant,
// one update per UTC calendar day including explicitly verified rest days.
export type EwmaState = { ctl: number; atl: number; tsb: number };
export function dailyLoadValue(session: { session_trimp?: unknown; session_tss?: unknown }): number {
  for (const value of [session.session_trimp, session.session_tss]) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  }
  throw new Error('training_load_missing_or_invalid');
}
export function nextDailyEwma(
  state: EwmaState, load: number, ctlTau = 42, atlTau = 7,
): EwmaState {
  if (![state.ctl, state.atl, load].every(v => Number.isFinite(v) && v >= 0) ||
      ![ctlTau, atlTau].every(v => Number.isFinite(v) && v > 0)) {
    throw new Error('invalid_ewma_input');
  }
  const ctl = state.ctl + (load - state.ctl) * (1 - Math.exp(-1 / ctlTau));
  const atl = state.atl + (load - state.atl) * (1 - Math.exp(-1 / atlTau));
  return { ctl, atl, tsb: ctl - atl };
}
