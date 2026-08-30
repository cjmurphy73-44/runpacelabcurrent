/**
 * Core telemetry, physiological inputs, and calculation return types.
 * 
 * @citation TrainPaceLab Core Architecture
 * @assumption Standardized metric types for zero-dependency calculations.
 * @limitation None (pure type definitions).
 */

export interface TelemetrySample {
  timestamp: number;
  heartRate?: number;
  power?: number;
  paceSecondsPerKm?: number;
  grade?: number;
  altitude?: number;
}

export interface BanisterLoadInput {
  date: string;
  tss: number;
}

export interface FitnessSummary {
  date: string;
  ctl: number; // Chronic Training Load (Fitness, 42d EWMA)
  atl: number; // Acute Training Load (Fatigue, 7d EWMA)
  tsb: number; // Training Stress Balance (Form, CTL - ATL)
}

export interface VdotResult {
  vdot: number;
  easyPaceSecPerKm: number;
  marathonPaceSecPerKm: number;
  thresholdPaceSecPerKm: number;
  intervalPaceSecPerKm: number;
  repetitionPaceSecPerKm: number;
}
