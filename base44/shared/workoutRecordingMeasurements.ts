import { resolveTimeInZone } from './hrZones.ts';
import { resolveSessionLoad } from './loadModel.ts';
import { summarizeRecordingCoverage, summarizeRecordingWindows } from './recordingWindows.js';

export function recordingDuration(workout) {
  return Number(workout.duration_seconds) || Number(workout.duration_minutes) * 60;
}

export function measureWorkoutRecording(workout, athlete, decoded) {
  const durationSeconds = recordingDuration(workout);
  const coverage = summarizeRecordingCoverage({ ...workout, streams: decoded.stream });
  const restHr = athlete?.resting_hr || 60;
  const maxHr = athlete?.max_heart_rate || workout.max_hr || 190;
  const zones = resolveTimeInZone({ stream: decoded.stream, durationSeconds, restHr, maxHr, measuredOnly: true });
  const load = resolveSessionLoad({
    stream: decoded.stream, durationSeconds, avgHr: decoded.summary.avg_hr || workout.avg_hr,
    restHr, maxHr, sex: athlete?.sex,
  });
  const measuredLoad = load.load_source === 'stream' && zones.coverage_pct >= 95
    ? { ...load, load_coverage_pct: zones.coverage_pct } : null;
  return { coverage, zones, measuredLoad };
}

export function recordingAnalysis(decoded, coverage, zones) {
  return {
    coverage, ...zones,
    windows: {
      300: summarizeRecordingWindows(decoded.stream, 300),
      600: summarizeRecordingWindows(decoded.stream, 600),
    },
  };
}
