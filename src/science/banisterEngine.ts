/**
 * Banister Fitness-Fatigue Engine (Pure Implementation)
 *
 * Implements standard EWMA models for:
 * - CTL (Chronic Training Load / Fitness) - 42-day time constant
 * - ATL (Acute Training Load / Fatigue) - 7-day time constant
 * - TSB (Training Stress Balance / Form)
 *
 * Formulae:
 * CTL_t = CTL_{t-1} + (TRIMP_t - CTL_{t-1}) * (1 - e^(-1/tau_ctl))
 * ATL_t = ATL_{t-1} + (TRIMP_t - ATL_{t-1}) * (1 - e^(-1/tau_atl))
 */

export interface BanisterState {
  ctl: number;
  atl: number;
  tsb: number;
}

/**
 * Calculates the next day's training loads based on current state and new input stress.
 */
export function calculateNextBanisterState(
  currentState: BanisterState,
  dailyTss: number,
  tauCtl: number = 42,
  tauAtl: number = 7
): BanisterState {
  const ctlFactor = 1 - Math.exp(-1 / tauCtl);
  const atlFactor = 1 - Math.exp(-1 / tauAtl);

  const nextCtl = currentState.ctl + (dailyTss - currentState.ctl) * ctlFactor;
  const nextAtl = currentState.atl + (dailyTss - currentState.atl) * atlFactor;
  const nextTsb = nextCtl - nextAtl;

  return {
    ctl: Math.round(nextCtl * 100) / 100,
    atl: Math.round(nextAtl * 100) / 100,
    tsb: Math.round(nextTsb * 100) / 100,
  };
}

/**
 * Simulates a series of days.
 */
export function simulateBanisterSeries(
  tssSeries: number[],
  initialState: BanisterState = { ctl: 0, atl: 0, tsb: 0 },
  tauCtl: number = 42,
  tauAtl: number = 7
): BanisterState[] {
  const results: BanisterState[] = [];
  let current = initialState;

  for (const tss of tssSeries) {
    current = calculateNextBanisterState(current, tss, tauCtl, tauAtl);
    results.push(current);
  }

  return results;
}
