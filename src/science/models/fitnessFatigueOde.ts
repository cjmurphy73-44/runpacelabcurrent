// src/science/models/fitnessFatigueOde.ts
// Two-Compartment ODE Fitness-Fatigue model — deterministic state-space implementation
// of the coupled ordinary differential equations from Banister's impulse-response model.
//
//   df/dt = k₁·w(t) − f(t)/τ₁     (fitness compartment)
//   dg/dt = k₂·w(t) − g(t)/τ₂     (fatigue compartment)
//
// where w(t) is the daily training impulse (TRIMP / TSS), f(t) is accumulated fitness,
// g(t) is accumulated fatigue, and form p(t) = f(t) − g(t).
//
// Unlike the single-EWMA approach in load.ts (which conflates intensity and volume into
// one stress scalar with identical gain), this model carries separate gain constants k₁
// and k₂ so that fitness and fatigue can accumulate at different rates from the same
// training impulse — closer to the physiology of supercompensation.
//
// Integration: explicit Euler with a 1-day step size (dt = 1).
// Reference: Banister, E.W. (1991). "Modeling Elite Athletic Performance."
// In: Physiological Tests for Elite Athletes, Human Kinetics.

export interface DailyTrainingLoad {
  date: string; // ISO format 'YYYY-MM-DD'
  trimp: number; // Impulse load (calculated from duration, intensity, HR)
}

export interface ModelParameters {
  tau1: number; // Fitness decay constant (days), typically 42
  tau2: number; // Fatigue decay constant (days), typically 7
  k1: number;   // Fitness gain scaling factor, default 1.0
  k2: number;   // Fatigue gain scaling factor, default 1.5
  baselinePerformance: number; // Baseline fitness level (e.g. VDOT or speed)
}

export interface DayState {
  date: string;
  load: number;
  fitness: number;   // f(t)
  fatigue: number;   // g(t)
  form: number;      // p(t) = f(t) - g(t)
  predictedPerformance: number; // Baseline + k1*f(t) - k2*g(t)
}

export const DEFAULT_ODE_PARAMS: ModelParameters = {
  tau1: 42,
  tau2: 7,
  k1: 1.0,
  k2: 1.5,
  baselinePerformance: 50.0,
};

/**
 * Solves the 2-compartment ODE model over a discrete time-series array using Euler steps.
 *
 * The input history is sorted chronologically. Each day's training impulse w(t) is
 * applied as a discrete step, and the fitness and fatigue compartments are updated
 * via explicit Euler integration:
 *
 *   f(t+1) = f(t) + (k₁·w − f(t)/τ₁)
 *   g(t+1) = g(t) + (k₂·w − g(t)/τ₂)
 *
 * Form (performance potential) is p(t) = f(t) − g(t), and predicted performance is
 * baseline + p(t).
 */
export function calculateFitnessFatigueOde(
  history: DailyTrainingLoad[],
  params: ModelParameters = DEFAULT_ODE_PARAMS
): DayState[] {
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentFitness = 0;
  let currentFatigue = 0;

  return sortedHistory.map((day) => {
    const w = day.trimp;

    // Discrete Euler integration step for 1-day step size (dt = 1)
    // df/dt = k1*w - f/tau1  =>  f(t+1) = f(t) + (k1*w - f(t)/tau1)
    const df = params.k1 * w - currentFitness / params.tau1;
    const dg = params.k2 * w - currentFatigue / params.tau2;

    currentFitness += df;
    currentFatigue += dg;

    const form = currentFitness - currentFatigue;
    const predictedPerformance = params.baselinePerformance + form;

    return {
      date: day.date,
      load: w,
      fitness: Number(currentFitness.toFixed(2)),
      fatigue: Number(currentFatigue.toFixed(2)),
      form: Number(form.toFixed(2)),
      predictedPerformance: Number(predictedPerformance.toFixed(2)),
    };
  });
}