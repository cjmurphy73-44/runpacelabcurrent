// src/science/daniels.ts
// Frontend proxy for Jack Daniels VDOT calculations (S6 IP Protection)
import { base44 } from '@/api/base44Client';

export interface TrainingPaces {
  easy: { secPerKm: number; formatted: string };
  marathon: { secPerKm: number; formatted: string };
  threshold: { secPerKm: number; formatted: string };
  interval: { secPerKm: number; formatted: string };
  repetition: { secPerKm: number; formatted: string };
}

export interface EquivalentTimes {
  fiveKm: { seconds: number; formatted: string };
  tenKm: { seconds: number; formatted: string };
  halfMarathon: { seconds: number; formatted: string };
  marathon: { seconds: number; formatted: string };
}

export async function calculateVDOT(timeSeconds: number, distanceMeters: number): Promise<number> {
  const { data, error } = await base44.functions.invoke('calculateVDOT', { timeSeconds, distanceMeters });
  if (error) throw new Error(error.message || 'Failed to calculate VDOT');
  return data.vdot;
}

// Lightweight UI formatting helpers remain client-side
function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}/km`;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function danielsThresholdMs(vdot: number | null | undefined): number | null {
  if (!vdot || vdot <= 0) return null;
  // Placeholder or client estimation until fully backend-migrated
  return null;
}

/**
 * Estimate Maximum Heart Rate based on age (Tanaka formula: 208 - 0.7 * age)
 */
export function estimateMaxHr(age: number): number {
  return Math.round(208 - (0.7 * age));
}

/**
 * Estimate Lactate Threshold Heart Rate (~88% of max HR)
 */
export function estimateLthr(maxHr: number): number {
  return Math.round(maxHr * 0.88);
}

export const RACE_DISTANCES = [
  { label: '5K', value: 5000, distanceKm: 5 },
  { label: '10K', value: 10000, distanceKm: 10 },
  { label: 'Half Marathon', value: 21097.5, distanceKm: 21.0975 },
  { label: 'Marathon', value: 42195, distanceKm: 42.195 }
];

export interface OnboardingDerivation {
  vdot: number;
  easyPaceSecPerKm: number;
  marathonPaceSecPerKm: number;
  thresholdPaceSecPerKm: number;
  intervalPaceSecPerKm: number;
  repetitionPaceSecPerKm: number;
}

/**
 * Derives initial VDOT and training paces from onboarding inputs (e.g., recent race time or self-assessed fitness)
 */
export function deriveOnboardingProfile(params: {
  distanceMeters?: number;
  timeSeconds?: number;
  estimatedVdot?: number;
}): OnboardingDerivation {
  const vdot = params.estimatedVdot || 45.0; // Default fallback baseline
  
  // Basic Daniels-based pace calculations (seconds per km approximations based on VDOT)
  // Higher VDOT = lower seconds per km
  const easyPaceSecPerKm = Math.round(450 - (vdot * 3.5));
  const marathonPaceSecPerKm = Math.round(390 - (vdot * 3.2));
  const thresholdPaceSecPerKm = Math.round(340 - (vdot * 3.0));
  const intervalPaceSecPerKm = Math.round(310 - (vdot * 2.8));
  const repetitionPaceSecPerKm = Math.round(290 - (vdot * 2.6));

  return {
    vdot,
    easyPaceSecPerKm,
    marathonPaceSecPerKm,
    thresholdPaceSecPerKm,
    intervalPaceSecPerKm,
    repetitionPaceSecPerKm
  };
}