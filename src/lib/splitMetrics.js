// Shared split speed and pace presentation for every persisted WorkoutSession.sport.
// Distance is stored in km; durations in seconds; FIT/TCX average speeds in m/s.
// Prefer distance / elapsed time for consistent split averages. Device moving-speed
// can differ after pauses, so it is only a fallback when duration/distance are absent.
export const PACE_PER_KM_SPORTS = Object.freeze([
  'running', 'trail_running', 'walking', 'hiking',
]);
export const PACE_PER_100M_SPORTS = Object.freeze(['swimming']);
export const PACE_PER_500M_SPORTS = Object.freeze(['rowing', 'kayaking']);
export const SPEED_SPORTS = Object.freeze([
  'cycling', 'mountain_biking', 'e_bike', 'cross_country_skiing',
  'downhill_skiing', 'snowboarding', 'elliptical', 'stair_climbing',
  'tennis', 'soccer', 'climbing', 'boxing', 'strength', 'yoga', 'triathlon', 'other',
]);

const NON_DISTANCE_SPORTS = Object.freeze(['strength', 'yoga', 'boxing', 'climbing']);

const NUMBER = value => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const isPositive = value => value !== null && value > 0;

export function splitMetricKind(sport) {
  if (NON_DISTANCE_SPORTS.includes(sport)) return 'not_applicable';
  if (PACE_PER_KM_SPORTS.includes(sport)) return 'pace_km';
  if (PACE_PER_100M_SPORTS.includes(sport)) return 'pace_100m';
  if (PACE_PER_500M_SPORTS.includes(sport)) return 'pace_500m';
  return 'speed_kmh';
}

function fmtPace(seconds, distanceUnit) {
  const perUnit = seconds / distanceUnit;
  if (!Number.isFinite(perUnit) || perUnit <= 0) return '—';
  const whole = Math.round(perUnit);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function splitMetricLabel(sport) {
  switch (splitMetricKind(sport)) {
    case 'pace_km': return 'Avg pace (/km)';
    case 'pace_100m': return 'Avg pace (/100m)';
    case 'pace_500m': return 'Avg pace (/500m)';
    case 'not_applicable': return 'Speed';
    default: return 'Avg speed (km/h)';
  }
}

export function splitMetric(lap, sport) {
  const duration = NUMBER(lap?.duration_s);
  const distance = NUMBER(lap?.distance_km);
  const avgSpeedMps = NUMBER(lap?.avg_speed);
  const hasElapsedAverage = isPositive(duration) && isPositive(distance);
  // Do not convert a non-distance workout into a made-up pace. A validated
  // device speed may still be shown if there are no usable distance/time fields.
  const elapsedKmh = hasElapsedAverage ? distance / duration * 3600 : null;
  const fallbackKmh = isPositive(avgSpeedMps) && avgSpeedMps <= 35 ? avgSpeedMps * 3.6 : null;
  const kmh = isPositive(elapsedKmh) ? elapsedKmh : fallbackKmh;
  const kind = splitMetricKind(sport);
  if (kind === 'not_applicable') return { text: '—', source: 'not_applicable', kind };
  if (!isPositive(kmh)) return { text: '—', source: 'unavailable', kind };
  // Durations and rounded distances are preferred to device speed since the
  // latter may represent a different moving-time denominator.
  const source = hasElapsedAverage ? 'elapsed_average' : 'device_speed';
  if (kind === 'speed_kmh') return { text: `${kmh.toFixed(1)} km/h`, source, kind };
  const unitDistance = kind === 'pace_100m' ? 0.1 : kind === 'pace_500m' ? 0.5 : 1;
  const paceSeconds = 3600 * unitDistance / kmh;
  return { text: `${fmtPace(paceSeconds, 1)} /${kind === 'pace_100m' ? '100m' : kind === 'pace_500m' ? '500m' : 'km'}`, source, kind };
}

export function splitDistanceText(km) {
  const distance = NUMBER(km);
  if (!isPositive(distance)) return '—';
  // Swim/rowing laps can be 25–500 m. Do not round a 25m lap to 0.03 km.
  if (distance < 1) return `${Math.round(distance * 1000)} m`;
  return `${distance.toFixed(2)} km`;
}

export function splitDurationText(seconds) {
  const number = NUMBER(seconds);
  if (!isPositive(number)) return '—';
  const whole = Math.round(number);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remainder = whole % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}
