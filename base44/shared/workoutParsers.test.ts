import { describe, expect, it } from 'vitest';
import { parseFitWithLaps } from './workoutParsers.ts';

function uint16(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function uint32(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

function syntheticFit1Hz(recordCount: number): Uint8Array {
  const definition = [
    0x40, 0x00, 0x00, ...uint16(20), 0x04,
    253, 4, 0x86, // timestamp (uint32)
    3, 1, 0x02, // heart rate (uint8)
    5, 4, 0x86, // distance in centimeters (uint32)
    7, 2, 0x84, // power in watts (uint16)
  ];
  const records: number[] = [];
  const startTimestamp = 1_000_000_000;
  for (let second = 0; second < recordCount; second++) {
    records.push(
      0x00,
      ...uint32(startTimestamp + second),
      140 + (second % 10),
      ...uint32(second * 300),
      ...uint16(200 + (second % 20)),
    );
  }

  const data = [...definition, ...records];
  return new Uint8Array([
    14, 0x20, ...uint16(0), ...uint32(data.length), 0x2e, 0x46, 0x49, 0x54, 0, 0,
    ...data,
    0, 0, // FIT file CRC (the parser only needs the record section)
  ]);
}

describe('parseFitWithLaps', () => {
  it('parses synthetic per-second FIT records into a 1 Hz stream and summary', () => {
    const parsed = parseFitWithLaps(syntheticFit1Hz(60));

    expect(parsed).not.toBeNull();
    expect(parsed.stream).toHaveLength(60);
    expect(parsed.stream[0]).toMatchObject({ time: 0, heart_rate: 140, distance: 0, power: 200 });
    expect(parsed.stream[1]).toMatchObject({ time: 1, heart_rate: 141, distance: 3, power: 201 });
    expect(parsed.stream[59]).toMatchObject({ time: 59, distance: 177 });
    expect(parsed.summary).toMatchObject({ duration_seconds: 59, distance_km: 0.18 });
  });
});
