import { describe, expect, it } from 'vitest';
import { planRecordingChunks, validateRecordingChunks } from '../../../base44/shared/recordingChunks';

function syntheticRecording(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    time: i,
    heart_rate: 115 + (i % 45),
    distance: i * 4.5,
    power: i % 13 === 0 ? 0 : 185 + (i % 20),
  }));
}

describe('bounded lossless recording chunk planning', () => {
  it('preserves an 84-minute original recording without 3600-sample truncation', () => {
    const samples = syntheticRecording(5041);
    const result = planRecordingChunks(samples);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chunks).toHaveLength(17);
    expect(result.chunks[0].sample_count).toBe(300);
    expect(result.chunks[16].sample_count).toBe(241);
    expect(result.chunks[16].end_time_s).toBe(5040);
    expect(validateRecordingChunks(result.chunks, 5041)).toBe(true);
    expect(result.chunks.flatMap(c => c.samples).map(p => p.time))
      .toEqual(samples.map(p => p.time));
    expect(result.chunks[0].samples[0].power).toBe(0);
  });
  it('fails closed on over-budget recordings without returning partial chunks', () => {
    const result = planRecordingChunks(syntheticRecording(28801));
    expect(result).toMatchObject({ ok: false, reason: 'exceeds_chunk_budget', chunks: [] });
  });
  it('rejects invalid and duplicate timestamps rather than assigning fake times', () => {
    expect(planRecordingChunks([{ time: 1 }, { time: 1 }]).ok).toBe(false);
    expect(planRecordingChunks([{ time: 1 }, { time: NaN }]).ok).toBe(false);
    expect(planRecordingChunks([{ time: -1 }, { time: 0 }]).ok).toBe(false);
  });
  it('detects dropped, reordered and altered chunks before consumption', () => {
    const result = planRecordingChunks(syntheticRecording(900));
    if (!result.ok) throw Error('Unexpected failure');
    const chunks = result.chunks;
    expect(validateRecordingChunks(chunks.slice(0, 2), 900)).toBe(false);
    expect(validateRecordingChunks([...chunks].reverse(), 900)).toBe(false);
    expect(validateRecordingChunks(chunks.map((c, i) => i === 1
      ? { ...c, sample_count: c.sample_count - 1 } : c), 900)).toBe(false);
  });
  it('rejects unsupported chunk sizes before allocating', () => {
    expect(planRecordingChunks(syntheticRecording(100), { chunkSize: 1000 }))
      .toMatchObject({ ok: false, chunks: [] });
  });
});
