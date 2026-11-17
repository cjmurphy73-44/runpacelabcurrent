import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { recordingTruncationNotice } from '../../../base44/shared/recordingTruncationNotice.ts';

const source = readFileSync(new URL('../../../base44/functions/backfillTelemetry/entry.ts', import.meta.url), 'utf8');

describe('COROS backfill full-duration recording disclosure contract', () => {
  it('returns a separate warning field rather than counting successful recoveries as errors', () => {
    expect(source).toMatch(/recording_notices,/);
    expect(source).toMatch(/recording_notice: recordingTruncationNotice\(masterStream, MAX_STREAM_SAMPLES\)/);
    expect(source).not.toMatch(/errors\.push\(\{[^}]*recording_notice/);
  });
  it('only reports a truncation notice after the session update resolves', () => {
    const start = source.indexOf('await base44.asServiceRole.entities.WorkoutSession.update(session.id, res.update)');
    const notice = source.indexOf('if (res.recording_notice) recording_notices.push', start);
    const end = source.indexOf('if (res.outcome', start);
    expect(start).toBeGreaterThan(-1);
    expect(notice).toBeGreaterThan(start);
    expect(notice).toBeLessThan(end);
  });
  it('keeps the original recording available for metric calculation before storage slicing', () => {
    expect(source).toMatch(/resolveSessionLoad\(\{[\s\S]*?stream: masterStream/);
    expect(source).toMatch(/streams: storageStream\(masterStream\.slice\(0, MAX_STREAM_SAMPLES\)\)/);
    const original = Array.from({ length: 7201 }, (_, time) => ({ time }));
    expect(recordingTruncationNotice(original)).toContain('7201 samples');
    expect(recordingTruncationNotice(original)).toContain('0s–7200s');
  });
});
