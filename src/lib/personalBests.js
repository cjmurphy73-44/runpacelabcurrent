import moment from "moment";

export const STANDARD_DISTANCES = [
  { key: "800m", label: "800m", km: 0.8 },
  { key: "1k", label: "1K", km: 1 },
  { key: "1mile", label: "1 Mile", km: 1.60934 },
  { key: "5k", label: "5K", km: 5, minKm: 4.9, maxKm: 5.25 },
  { key: "10k", label: "10K", km: 10, minKm: 9.8, maxKm: 10.3 },
  { key: "15k", label: "15K", km: 15 },
  { key: "half", label: "Half Marathon", km: 21.0975, minKm: 20.7, maxKm: 21.6 },
  { key: "full", label: "Marathon", km: 42.195, minKm: 41.5, maxKm: 43.2 },
  { key: "50k", label: "50K", km: 50 },
  { key: "100k", label: "100K", km: 100 },
  { key: "100mi", label: "100 Mile", km: 160.934 },
];

export const PEAK_DURATIONS = [
  { key: "1min", label: "Peak 1 min", sec: 60 },
  { key: "5min", label: "Peak 5 min", sec: 300 },
  { key: "20min", label: "Peak 20 min", sec: 1200 },
  { key: "60min", label: "Peak 60 min", sec: 3600 },
];

const DISTANCE_TOLERANCE = 0.05;

function isValidForStandard(dist, standard) {
  if (standard.minKm && standard.maxKm) {
    return dist >= standard.minKm && dist <= standard.maxKm;
  }
  return Math.abs(dist - standard.km) / standard.km <= DISTANCE_TOLERANCE;
}

export function formatDuration(minutes) {
  const totalSeconds = Math.round(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatPace(minPerKm) {
  if (!minPerKm || !isFinite(minPerKm)) return "—";
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

// Build a monotonic distance track (meters) from a session's telemetry stream.
// The stream is ~1 sample/second (array index = seconds) and carries cumulative `distance`
// in meters; `time` is null in stored streams, so we use the index as the time axis.
function buildDistanceTrack(stream) {
  const pts = stream || [];
  if (pts.length < 2) return null;
  let hasDistance = pts.some((p) => p && typeof p.distance === "number" && p.distance > 0);
  let hasSpeed = pts.some((p) => p && typeof p.speed === "number" && p.speed > 0);
  if (!hasDistance && !hasSpeed) return null;

  const track = [];
  let cum = 0;
  let maxD = 0;
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k] || {};
    let d = typeof p.distance === "number" && isFinite(p.distance) ? p.distance : null;
    if (d == null) {
      const sp = typeof p.speed === "number" && isFinite(p.speed) ? p.speed : 0;
      cum += sp; // 1 second per sample
      d = cum;
    }
    // enforce non-decreasing (GPS noise) and accumulate max envelope
    if (d < maxD) d = maxD;
    maxD = d;
    track.push({ t: k, d });
  }
  return track;
}

// Sliding two-pointer: fastest contiguous segment covering exactly `targetMeters`.
// Returns elapsed seconds (with sub-second interpolation at the crossing), or null.
function fastestDistanceSplit(track, targetMeters) {
  if (!track || track.length < 2) return null;
  let best = null;
  let j = 0;
  for (let i = 0; i < track.length; i++) {
    if (j < i + 1) j = i + 1;
    while (j < track.length && track[j].d - track[i].d < targetMeters) j++;
    if (j >= track.length) break; // no point advancing i further (distance only grows)
    if (track[j].d - track[i].d < targetMeters) continue;
    // interpolate the exact crossing time between j-1 and j
    const prev = track[j - 1];
    const span = track[j].d - prev.d;
    let crossT;
    if (span > 0) {
      const need = targetMeters - (prev.d - track[i].d);
      const frac = Math.max(0, Math.min(1, need / span));
      crossT = prev.t + frac * (track[j].t - prev.t);
    } else {
      crossT = track[j].t;
    }
    const elapsed = crossT - track[i].t;
    if (elapsed > 0 && (best === null || elapsed < best)) best = elapsed;
  }
  return best;
}

// Finds the fastest recorded effort for each standard race distance by scanning the
// telemetry splits of EVERY qualifying session (true sub-split extraction), not just
// whole-session matches. Falls back to whole-session time only when a session has no
// usable stream and its total distance closely matches the standard distance.
export function findDistancePBs(sessions, sport = "running", filterFn = null) {
  const activities = sessions.filter(
    (s) => s.sport === sport && (s.distance_km > 0 || (s.streams && s.streams.length > 1)) && (!filterFn || filterFn(s))
  );
  const result = {};
  for (const dist of STANDARD_DISTANCES) {
    const targetMeters = dist.km * 1000;
    let best = null; // { session, timeMinutes, paceMinPerKm, fromSplit }

    for (const s of activities) {
      let candidateSec = null;
      let fromSplit = false;
      const track = buildDistanceTrack(s.streams);
      if (track) {
        const seg = fastestDistanceSplit(track, targetMeters);
        if (seg !== null) {
          candidateSec = seg;
          fromSplit = true;
        }
      }
      // whole-session fallback: only when no stream split AND total distance matches
      if (candidateSec === null && isValidForStandard(s.distance_km, dist) && s.distance_km > 0) {
        candidateSec = (s.duration_seconds || s.duration_minutes * 60);
      }
      if (candidateSec === null) continue;
      if (best === null || candidateSec < best.timeMinutes * 60) {
        best = {
          session: s,
          timeMinutes: candidateSec / 60,
          paceMinPerKm: candidateSec / 60 / (dist.km),
          fromSplit,
        };
      }
    }
    result[dist.key] = best;
  }
  return result;
}

// Best sustained average of `key` (power/speed) over a window >= durationSec, using the raw telemetry stream.
function bestAverageOverWindow(stream, durationSec, key) {
  const pts = (stream || [])
    .filter((p) => typeof p[key] === "number" && typeof p.time === "number")
    .sort((a, b) => a.time - b.time);
  if (pts.length < 2) return null;

  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const dt = pts[i].time - pts[i - 1].time;
    if (dt <= 0) continue;
    segs.push({ dt, val: (pts[i - 1][key] + pts[i][key]) / 2 });
  }
  if (segs.length === 0) return null;

  let start = 0;
  let windowDt = 0;
  let windowSum = 0;
  let best = null;
  for (let end = 0; end < segs.length; end++) {
    windowDt += segs[end].dt;
    windowSum += segs[end].val * segs[end].dt;
    while (start < end && windowDt - segs[start].dt >= durationSec) {
      windowDt -= segs[start].dt;
      windowSum -= segs[start].val * segs[start].dt;
      start++;
    }
    if (windowDt >= durationSec) {
      const avg = windowSum / windowDt;
      if (best === null || avg > best) best = avg;
    }
  }
  return best;
}

// Scans all sessions with stored streams for peak sustained power (any sport) and pace (running) over
// standard durations (1/5/20/60 min), pulled directly from raw telemetry — not just whole-session averages.
export function findPeakOutputs(sessions) {
  const power = {};
  const pace = {};
  for (const bucket of PEAK_DURATIONS) {
    power[bucket.key] = null;
    pace[bucket.key] = null;
  }

  for (const s of sessions) {
    if (!s.streams || s.streams.length < 2) continue;
    for (const bucket of PEAK_DURATIONS) {
      const avgPower = bestAverageOverWindow(s.streams, bucket.sec, "power");
      if (avgPower !== null && (power[bucket.key] === null || avgPower > power[bucket.key].value)) {
        power[bucket.key] = { value: Math.round(avgPower), session: s };
      }
      if (s.sport === "running") {
        const avgSpeed = bestAverageOverWindow(s.streams, bucket.sec, "speed");
        if (avgSpeed && avgSpeed > 0) {
          const paceMinPerKm = 1000 / (avgSpeed * 60);
          if (pace[bucket.key] === null || paceMinPerKm < pace[bucket.key].value) {
            pace[bucket.key] = { value: paceMinPerKm, session: s };
          }
        }
      }
    }
  }

  return { power, pace };
}

export function seasonFilter(session) {
  return moment(session.date).isSameOrAfter(moment().startOf("year"));
}