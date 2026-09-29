// src/science/daniels.ts
// Frontend proxy for Jack Daniels VDOT calculations (S6 IP Protection)
import { base44 } from '@base44/runtime';

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
