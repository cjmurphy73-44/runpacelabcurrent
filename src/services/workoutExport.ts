// src/services/workoutExport.ts
// Builds a structured-text workout file from a prescribed TrainingPlanSession
// so it can be imported into Garmin Connect's Workout Builder (or TrainingPeaks
// / similar) and pushed to a watch / bike computer.
//
// Garmin's native .fit workout is a compact binary protocol that requires the
// official Garmin FIT SDK to emit validly (size-prefixed messages + CRC). That
// encoder is intentionally out of scope here; instead we emit a structured-text
// (JSON) representation of the same step model — a documented "structured text
// alternative supported by platforms" per the C-15 spec. The shapes mirror
// Garmin Connect's workout-step vocabulary so import is a 1:1 copy.

export type StepType = 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'rest' | 'main';

export interface WorkoutStep {
  order: number;
  type: StepType;
  durationSeconds: number;
  targetPaceSecPerKm?: number;
  targetPowerWatts?: number;
  targetHrLow?: number;
  targetHrHigh?: number;
  description?: string;
}

export interface StructuredSession {
  id?: string;
  date?: string;
  sport?: string;
  prescribed_duration_minutes?: number;
  prescribed_intensity_zone?: string;
  structured_steps?: WorkoutStep[];
  rationale_text?: string;
}

interface ExportTarget {
  type: 'pace' | 'power' | 'heart_rate' | 'open';
  minSecPerKm?: number;
  maxSecPerKm?: number;
  minWatts?: number;
  maxWatts?: number;
  minBpm?: number;
  maxBpm?: number;
}

function buildTarget(s: WorkoutStep): ExportTarget {
  if (s.targetPaceSecPerKm) return { type: 'pace', minSecPerKm: Math.round(s.targetPaceSecPerKm - 3), maxSecPerKm: Math.round(s.targetPaceSecPerKm + 3) };
  if (s.targetPowerWatts) return { type: 'power', minWatts: Math.round(s.targetPowerWatts * 0.97), maxWatts: Math.round(s.targetPowerWatts * 1.03) };
  if (s.targetHrLow && s.targetHrHigh) return { type: 'heart_rate', minBpm: s.targetHrLow, maxBpm: s.targetHrHigh };
  return { type: 'open' };
}

// If a plan session carries no explicit structured steps, synthesise a single
// "main" block from its prescribed duration + intensity zone so every session
// is exportable.
function synthesizeFromPrescribed(session: StructuredSession): WorkoutStep[] {
  const total = (session.prescribed_duration_minutes ?? 0) * 60;
  const zone = (session.prescribed_intensity_zone ?? '').toUpperCase();
  return [
    {
      order: 1,
      type: 'main',
      durationSeconds: total,
      description: `Prescribed ${session.prescribed_duration_minutes ?? 0} min @ ${zone || 'target'}`,
    },
  ];
}

export interface BuiltWorkoutFile {
  filename: string;
  mime: string;
  content: string;
}

export function buildWorkoutFile(session: StructuredSession): BuiltWorkoutFile {
  const steps: WorkoutStep[] =
    session.structured_steps && session.structured_steps.length > 0
      ? session.structured_steps
      : synthesizeFromPrescribed(session);

  const fitSteps = steps.map((s, i) => ({
    stepOrder: i + 1,
    intensity: s.type,
    durationType: 'time',
    durationSeconds: Math.round(s.durationSeconds),
    target: buildTarget(s),
    notes: s.description ?? '',
  }));

  const payload = {
    fileType: 'TrainPaceLab Structured Workout v1',
    format: 'structured-text — Garmin Connect Workout Builder compatible',
    workoutName: `${(session.sport ?? 'workout').replace(/^./, (c) => c.toUpperCase())} — ${session.date ?? 'session'}`,
    sport: session.sport ?? 'running',
    scheduledDate: session.date ?? null,
    totalDurationSeconds: fitSteps.reduce((a, b) => a + b.durationSeconds, 0),
    steps: fitSteps,
  };

  const filename = `workout-${(session.date ?? 'session').replace(/[^\d-]/g, '') || 'session'}.json`;
  return { filename, mime: 'application/json', content: JSON.stringify(payload, null, 2) };
}

export function downloadWorkoutFile(session: StructuredSession): void {
  const { filename, mime, content } = buildWorkoutFile(session);
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}