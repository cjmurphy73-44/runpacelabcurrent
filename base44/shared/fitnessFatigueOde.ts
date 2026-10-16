// base44/shared/fitnessFatigueOde.ts
// Backend mirror of src/science/models/fitnessFatigueOde.ts — pure, I/O-free two-compartment
// ODE fitness-fatigue model. Duplicated (not imported from src/) because the frontend/backend
// boundary cannot be crossed at build time; this follows the same pattern as readiness.ts
// which exists in both base44/shared/ and src/science/.
//
//   df/dt = k1*w(t) - f(t)/tau1   (fitness compartment)
//   dg/dt = k2*w(t) - g(t)/tau2   (fatigue compartment)
//
// Explicit Euler integration with dt = 1 day.

export interface DailyTrainingLoad {
  date: string;
  trimp: number;
}

export interface ModelParameters {
  tau1: number;
  tau2: number;
  k1: number;
  k2: number;
  baselinePerformance: number;
}

export interface DayState {
  date: string;
  load: number;
  fitness: number;
  fatigue: number;
  form: number;
  predictedPerformance: number;
}

export const DEFAULT_ODE_PARAMS: ModelParameters = {
  tau1: 42,
  tau2: 7,
  k1: 1.0,
  k2: 1.5,
  baselinePerformance: 50.0,
};

export function calculateFitnessFatigueOde(
  history: DailyTrainingLoad[],
  params: ModelParameters = DEFAULT_ODE_PARAMS
): DayState[] {
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let f = 0;
  let g = 0;

  return sorted.map((day) => {
    const w = day.trimp;
    const df = params.k1 * w - f / params.tau1;
    const dg = params.k2 * w - g / params.tau2;
    f += df;
    g += dg;
    const form = f - g;
    const perf = params.baselinePerformance + form;
    return {
      date: day.date,
      load: w,
      fitness: Math.round(f * 100) / 100,
      fatigue: Math.round(g * 100) / 100,
      form: Math.round(form * 100) / 100,
      predictedPerformance: Math.round(perf * 100) / 100,
    };
  });
}