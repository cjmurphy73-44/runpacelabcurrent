// base44/shared/streamReconcile.ts
// Strict-priority stream + lap reconciliation engine for native multi-file workouts.
// Given every bound asset's parsed stream + laps, unifies them into a single master
// stream and a single laps array using the fixed ladder FIT > TCX > CSV > manual:
// the highest-priority asset that carries a channel at a given timestamp wins,
// lower-priority assets only fill channels the higher one is missing. Plain module —
// no Deno.serve. Import from a function entry via:
//   import { reconcileStreams, SOURCE_PRIORITY, recomputePhysiology } from '../../shared/streamReconcile.ts';

import { computeNgpSeries, computeDecouplingAndEF } from './physiology.ts';

import { SOURCE_PRIORITY } from './workoutParsers.ts';
export { SOURCE_PRIORITY };

const CHANNELS = ['heart_rate', 'altitude', 'distance', 'cadence', 'speed', 'power'];
const NEAREST_TOLERANCE_S = 2.0;

function nearestValue(stream, t, channel) {
  let best = null;
  let bestDiff = NEAREST_TOLERANCE_S;
  for (const p of stream) {
    const v = p[channel];
    if (typeof v !== 'number' || isNaN(v)) continue;
    const d = Math.abs(p.time - t);
    if (d <= bestDiff) { best = v; bestDiff = d; }
  }
  return best;
}

// Unify a set of per-asset stream+laps payloads into one master stream + one laps array.
// assets: [{ fileType, stream, laps }]
export function reconcileStreams(assets) {
  const byPriority = (assets || [])
    .filter((a) => Array.isArray(a.stream) && a.stream.length > 0)
    .sort((a, b) => (SOURCE_PRIORITY[b.fileType] || 0) - (SOURCE_PRIORITY[a.fileType] || 0));

  const masterLaps = reconcileLaps(assets);

  if (byPriority.length === 0) return { masterStream: [], masterLaps };

  const master = byPriority[0];
  const fallbacks = byPriority.slice(1);

  // The dominant (highest-priority) asset's timestamps define the master timeline.
  // Missing channels in the dominant sample are filled from lower-priority assets by
  // nearest-time lookup (within a 2s tolerance) so a FIT sampling gap can be patched
  // by TCX without ever overriding a FIT value the FIT asset actually reported.
  const masterStream = master.stream.map((sample) => {
    const merged = { ...sample };
    for (const channel of CHANNELS) {
      const v = merged[channel];
      if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) {
        for (const fb of fallbacks) {
          const fill = nearestValue(fb.stream, sample.time, channel);
          if (fill !== null) { merged[channel] = fill; break; }
        }
      }
    }
    return merged;
  });

  return { masterStream, masterLaps };
}

// Lap resolution respects the same priority ladder — the highest-priority asset that
// produced any lap segments supplies the session's laps outright. Summary CSV exports
// are whole-activity rows (no lap rows), so in practice laps come from FIT (msg 19)
// then TCX (<Lap>).
function reconcileLaps(assets) {
  for (const t of ['fit', 'tcx', 'csv', 'manual']) {
    const a = (assets || []).find((x) => x.fileType === t && Array.isArray(x.laps) && x.laps.length > 0);
    if (a) {
      return a.laps.map((l, i) => ({
        lap_index: typeof l.lap_index === 'number' ? l.lap_index : i,
        start_time_offset_s: l.start_time_offset_s ?? null,
        duration_s: l.duration_s ?? null,
        distance_km: l.distance_km ?? null,
        avg_hr: l.avg_hr ?? null,
        max_hr: l.max_hr ?? null,
        avg_speed: l.avg_speed ?? null,
      }));
    }
  }
  return [];
}

// Re-derive Efficiency Factor + aerobic decoupling from a freshly reconciled master
// stream. Discipline-specific (running uses pace-graded NGP, cycling uses raw power).
// Other disciplines keep these null. Never touches load (TRIMP/TSS).
export function recomputePhysiology(masterStream, sport, durationMinutes, avgHrFallback) {
  let aerobic_decoupling = null;
  let efficiency_factor = null;
  let avg_ngp = null;
  if (sport === 'running') {
    const ngpSeries = computeNgpSeries(masterStream);
    ({ aerobic_decoupling, efficiency_factor, avg_ngp } = computeDecouplingAndEF(ngpSeries, durationMinutes, avgHrFallback));
  } else if (sport === 'cycling') {
    const powerSeries = masterStream
      .filter((p) => typeof p.power === 'number' && typeof p.time === 'number')
      .map((p) => ({ time: p.time, ngp: p.power, hr: p.heart_rate ?? null }));
    ({ aerobic_decoupling, efficiency_factor } = computeDecouplingAndEF(powerSeries, durationMinutes, avgHrFallback));
  }
  return { aerobic_decoupling, efficiency_factor, avg_ngp };
}

// Surface the dominant (highest-priority) file type among a set of parsed assets —
// used to keep the session's source_format in sync with which asset actually
// produced its master stream.
export function dominantFileType(assets) {
  return (assets || [])
    .filter((a) => Array.isArray(a.stream) && a.stream.length > 0)
    .sort((a, b) => (SOURCE_PRIORITY[b.fileType] || 0) - (SOURCE_PRIORITY[a.fileType] || 0))
    .map((a) => a.fileType)[0] || null;
}