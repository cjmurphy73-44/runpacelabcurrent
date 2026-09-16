// src/science/readiness.ts
// Frontend entry point for the holistic readiness engine.
// NOTE: this pure logic is mirrored in base44/shared/readiness.ts (used by backend ingest
// functions). The platform boundary forbids the client bundle from importing base44/, so
// the two copies must be kept in sync. No platform/Deno-specific APIs here.
export interface RecoverySignals {
  hrv?: number | null;              // ms (RMSSD)
  sleep_score?: number | null;      // 0-100 (vendor or normalized)
  sleep_duration_hours?: number | null;
  resting_hr?: number | null;
  body_battery?: number | null;      // 0-100 (Garmin)
  stress_score?: number | null;      // 0-100 (Garmin, lower is better)
  tsb?: number | null;               // Training Stress Balance (Form)
}

export interface RecoveryBaseline {
  hrv?: number | null;
  resting_hr?: number | null;
  sleep_score?: number | null;
  sleep_duration_hours?: number | null;
}

// Map a value's deviation from baseline to a 0-100 sub-score.
// z=0 -> 50, z=+1 -> ~85, z=-1 -> ~15. `scale` controls sensitivity (smaller = more sensitive).
// direction: 'higher' (higher is better) or 'lower' (lower is better).
function zSubScore(value: number | null, baseline: number | null, direction: 'higher' | 'lower', scale = 1): number | null {
  if (value == null || baseline == null || !isFinite(value) || !isFinite(baseline) || baseline === 0) return null;
  const z = (value - baseline) / (Math.abs(baseline) * scale + 1e-9);
  let raw = direction === 'higher' ? 50 + z * 35 : 50 - z * 35;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function computeHolisticReadiness(signals: RecoverySignals, baseline: RecoveryBaseline = {}): number {
  const subs: number[] = [];
  const weights: number[] = [];

  const hrvSub = zSubScore(signals.hrv, baseline.hrv, 'higher', 0.15);
  if (hrvSub != null) { subs.push(hrvSub); weights.push(0.3); }

  const rhrSub = zSubScore(signals.resting_hr, baseline.resting_hr, 'lower', 0.08);
  if (rhrSub != null) { subs.push(rhrSub); weights.push(0.2); }

  if (signals.sleep_score != null && isFinite(signals.sleep_score)) {
    subs.push(Math.max(0, Math.min(100, signals.sleep_score))); weights.push(0.2);
  } else if (signals.sleep_duration_hours != null && isFinite(signals.sleep_duration_hours)) {
    if (baseline.sleep_duration_hours != null) {
      const s = zSubScore(signals.sleep_duration_hours, baseline.sleep_duration_hours, 'higher', 0.2);
      if (s != null) { subs.push(s); weights.push(0.2); }
    } else {
      // Absolute: 8h -> 100, 6h -> 75, <5h -> low.
      subs.push(Math.max(0, Math.min(100, Math.round((signals.sleep_duration_hours / 8) * 100)))); weights.push(0.2);
    }
  }

  if (signals.body_battery != null && isFinite(signals.body_battery)) {
    subs.push(Math.max(0, Math.min(100, signals.body_battery))); weights.push(0.2);
  }

  // Stress: lower is better. 0-100 vendor scale.
  if (signals.stress_score != null && isFinite(signals.stress_score)) {
    subs.push(Math.max(0, Math.min(100, 100 - signals.stress_score))); weights.push(0.1);
  }

  // TSB (Form): positive = fresh, negative = fatigued. -30 -> ~15, 0 -> 60, +20 -> ~90.
  if (signals.tsb != null && isFinite(signals.tsb)) {
    subs.push(Math.max(0, Math.min(100, Math.round(60 + signals.tsb * 1.5)))); weights.push(0.1);
  }

  if (!subs.length) return 50;
  const totalW = weights.reduce((a, b) => a + b, 0);
  const weighted = subs.reduce((acc, s, i) => acc + s * weights[i], 0);
  return Math.max(1, Math.min(100, Math.round(weighted / (totalW || 1))));
}

// Rolling mean of a numeric field across recent history (most-recent-first or chronological both fine).
export function computeBaseline(history: any[], field: string, days = 14): number | null {
  if (!Array.isArray(history)) return null;
  const vals = history
    .map((d) => (d && typeof d[field] === 'number' && isFinite(d[field]) && d[field] > 0) ? d[field] : null)
    .filter((v): v is number => v != null);
  if (!vals.length) return null;
  const recent = vals.slice(0, days);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}