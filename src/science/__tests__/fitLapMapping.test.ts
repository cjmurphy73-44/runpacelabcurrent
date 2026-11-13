import { describe, expect, it } from 'vitest';
import { parseFitWithLaps } from '../../../base44/shared/workoutParsers';

// Synthetic FIT bytes: no athlete recordings or proprietary training values.
type Field = { id: number; size: number; type: number; value: number };
function definition(local: number, message: number, fields: Field[]) {
  const bytes = [0x40 | local, 0, 0, message, 0, fields.length];
  fields.forEach(f => bytes.push(f.id, f.size, f.type));
  return bytes;
}
function valueBytes(field: Field) {
  const bytes = Array(field.size).fill(0);
  let n = field.value;
  for (let i = 0; i < field.size; i++) {
    bytes[i] = n & 0xFF;
    n = Math.floor(n / 256);
  }
  return bytes;
}
function data(local: number, fields: Field[]) {
  return [local, ...fields.flatMap(valueBytes)];
}
function field(id: number, size: number, type: number, value: number): Field {
  return { id, size, type, value };
}
function syntheticFit(lapFields: Field[]) {
  const recordFields = [field(253, 4, 0x86, 100000), field(3, 1, 0x02, 175)];
  const endFields = [field(253, 4, 0x86, 100600), field(3, 1, 0x02, 185)];
  const body = [
    ...definition(0, 20, recordFields),
    ...data(0, recordFields),
    ...data(0, endFields),
    ...definition(1, 19, lapFields),
    ...data(1, lapFields),
  ];
  // 14-byte FIT header + message bytes + trailing CRC (parser skips CRC).
  const header = [14, 0x20, 0, 0, body.length & 0xff, (body.length >> 8) & 0xff, 0, 0, 0x2e, 0x46, 0x49, 0x54, 0, 0];
  return Uint8Array.from([...header, ...body, 0, 0]);
}
describe('FIT global message 19 lap mapping', () => {
  it('decodes elapsed time, distance, speed and HR from the correct FIT field numbers', () => {
    const bytes = syntheticFit([
      field(2, 4, 0x86, 100000), // start_time
      field(7, 4, 0x86, 617000), // total_elapsed_time (ms)
      field(8, 4, 0x86, 601000), // timer time (ms)
      field(9, 4, 0x86, 425000), // 4250m after scale /100
      field(13, 2, 0x84, 7000), // average speed 7m/s
      field(14, 2, 0x84, 10997), // max speed, MUST NOT appear as HR
      field(15, 1, 0x02, 178), // average HR
      field(16, 1, 0x02, 198), // max HR
    ]);
    const parsed = parseFitWithLaps(bytes);
    expect(parsed?.summary.avg_hr).toBe(180);
    expect(parsed?.laps).toHaveLength(1);
    expect(parsed?.laps[0]).toMatchObject({
      duration_s: 617,
      distance_km: 4.25,
      avg_speed: 7,
      avg_hr: 178,
      max_hr: 198,
      start_time_offset_s: 0,
    });
    expect(parsed?.laps[0].avg_hr).not.toBe(10997);
  });
  it('uses timer duration when elapsed is missing and ignores FIT invalid HR markers', () => {
    const parsed = parseFitWithLaps(syntheticFit([
      field(8, 4, 0x86, 601000),
      field(9, 4, 0x86, 0xffffffff),
      field(15, 1, 0x02, 0xff),
      field(16, 1, 0x02, 0xff),
    ]));
    expect(parsed?.laps[0].duration_s).toBe(601);
    expect(parsed?.laps[0].distance_km).toBeNull();
    expect(parsed?.laps[0].avg_hr).toBeNull();
    expect(parsed?.laps[0].max_hr).toBeNull();
  });
});
