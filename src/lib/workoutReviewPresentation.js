// Presentation-only, never a source for physiology or load computation.
export function recordingPresentation(workout) {
  const points = Array.isArray(workout?.streams) ? workout.streams : [];
  const duration = Number(workout?.duration_seconds) || Number(workout?.duration_minutes) * 60 || 0;
  const valid = points.length >= 2 && points.every((p, i) => Number.isFinite(p?.time) && (i === 0 || p.time > points[i - 1].time));
  const span = valid ? points[points.length - 1].time - points[0].time : 0;
  const startsAtBeginning = valid && points[0].time >= 0 && points[0].time <= 5;
  let maxGap = valid ? 0 : Infinity;
  if (valid) for (let i = 1; i < points.length; i++) maxGap = Math.max(maxGap, points[i].time - points[i - 1].time);
  const coverage = duration > 0 && valid ? Math.min(100, Math.round(100 * span / duration)) : null;
  const dense = valid && points.length >= 60 && span / (points.length - 1) <= 5;
  const measured = dense && points.filter(p => (Number.isFinite(p.heart_rate) && p.heart_rate > 0) || (Number.isFinite(p.power) && p.power >= 0)).length >= points.length / 2;
  const state = !measured ? 'summary' : coverage === null || coverage < 99 || !startsAtBeginning || maxGap > 5 ? 'partial' : 'recorded';
  return {
    state, count: points.length, coverage, span, duration, startsAtBeginning, maxGap,
    // Full original FIT preservation is not proven by a complete-looking persisted stream.
    label: state === 'recorded' ? 'Measured recording · original FIT retention unverified' : state === 'partial' ? 'Partial measured recording' : 'Summary / unverified recording',
    points: measured ? points : [],
  };
}
export function chartSeries(points, key, limit = 240) {
  if (!Array.isArray(points) || !['heart_rate','speed','power','pace'].includes(key)) return [];
  const step = Math.max(1, Math.ceil(points.length / limit));
  const selected = points.filter((_, i) => i % step === 0 || i === points.length - 1);
  return selected.map(p => {
    const value = key === 'pace' ? p.speed : p[key];
    const measured = Number.isFinite(value) && (key !== 'heart_rate' || value > 0) && value >= 0;
    return { minute: Math.round(p.time / 60 * 10) / 10,
      value: measured ? (key === 'pace' ? (value > 0 ? Math.round((1000 / value / 60) * 100) / 100 : null) : value) : null };
  });
}
