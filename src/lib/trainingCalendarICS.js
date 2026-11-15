// RFC 5545-compatible, deterministic calendar export. No remote sync is implied.
const escapeText = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const stamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const fold = (line) => {
  // Fold by UTF-8 octets, not JS characters, to avoid splitting multibyte text.
  const parts = [];
  let segment = '';
  let bytes = 0;
  for (const char of line) {
    const n = new TextEncoder().encode(char).length;
    if (bytes + n > 75) { parts.push(segment); segment = ' '; bytes = 1; }
    segment += char;
    bytes += n;
  }
  parts.push(segment);
  return parts.join('\r\n');
};

export function buildTrainingCalendarICS(workouts, { now = new Date() } = {}) {
  if (!Array.isArray(workouts)) throw new Error('Invalid workout schedule');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TrainPaceLab//Training Plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  let exported = 0;
  let skipped = 0;
  for (const workout of workouts) {
    // A calendar date is not a start time. Export an all-day event rather than
    // silently inventing 00:00 UTC or shifting dates across time zones.
    if (!validDate(workout?.date)) { skipped++; continue; }
    const day = workout.date.replace(/-/g, '');
    const next = new Date(workout.date + 'T00:00:00Z');
    next.setUTCDate(next.getUTCDate() + 1);
    const nextDay = next.toISOString().slice(0, 10).replace(/-/g, '');
    const identifier = String(workout.id || `${workout.date}-${exported}`).replace(/[^a-zA-Z0-9_-]/g, '-');
    const details = [
      workout.durationMinutes || workout.prescribed_duration_minutes ? `Duration: ${workout.durationMinutes || workout.prescribed_duration_minutes} minutes` : null,
      workout.intensity || workout.prescribed_intensity_zone ? `Intensity: ${workout.intensity || workout.prescribed_intensity_zone}` : null,
      workout.notes || workout.rationale_text || null,
    ].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT', `UID:tpl-${identifier}@trainpacelab.com`, `DTSTAMP:${stamp(now)}`, `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${nextDay}`, `SUMMARY:${escapeText(workout.title || workout.sport || 'Training session')}`, `DESCRIPTION:${escapeText(details)}`, 'END:VEVENT');
    exported++;
  }
  lines.push('END:VCALENDAR');
  return { content: lines.map(fold).join('\r\n') + '\r\n', exported, skipped };
}
