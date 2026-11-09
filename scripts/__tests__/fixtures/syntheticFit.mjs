// Synthetic 1 Hz FIT record messages only: no athlete, GPS or account data.
const u16 = value => [value & 255, (value >>> 8) & 255];
const u32 = value => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];

function crc16(bytes) {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
  }
  return crc;
}

export function syntheticFit1Hz(sampleCount) {
  if (!Number.isInteger(sampleCount) || sampleCount < 2) throw new Error('At least two samples required');
  const definition = [
    0x40, 0, 0, ...u16(20), 7,
    253, 4, 0x86, // timestamp, FIT epoch seconds
    3, 1, 0x02, // heart rate, bpm
    2, 2, 0x84, // altitude, scaled by 5 with offset 500
    5, 4, 0x86, // distance, centimeters
    4, 1, 0x02, // cadence, rpm
    6, 2, 0x84, // speed, millimeters/second
    7, 2, 0x84, // power, watts (decoded, but not currently persisted by this handler)
  ];
  const data = [...definition];
  for (let second = 0; second < sampleCount; second++) {
    data.push(0, ...u32(1_000_000_000 + second), 135 + second % 20,
      ...u16(2500 + second % 100), ...u32(second * 300), 80 + second % 5,
      ...u16(3000 + second % 10), ...u16(200 + second % 20));
  }
  // Header and file CRCs are populated even though the app decoder does not check them.
  const header = [14, 0x20, ...u16(100), ...u32(data.length), 0x2e, 0x46, 0x49, 0x54];
  header.push(...u16(crc16(header)));
  const bytes = new Uint8Array([...header, ...data]);
  return new Uint8Array([...bytes, ...u16(crc16(bytes))]);
}
