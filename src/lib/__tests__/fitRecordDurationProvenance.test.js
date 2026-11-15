import { describe, expect, it } from "vitest";
import { parseFitSummary } from "../fitSummaryParser";

// Synthetic FIT record-only stream, no real athlete/device data.
// FIT header (14 bytes), definition message (global 20), data records, CRC.
function recordOnlyFit(timestamps) {
  const dataSize = 1 + 1 + 1 + 2 + 1 + 3 + 3 + timestamps.length * (1 + 4 + 1);
  const bytes = new Uint8Array(14 + dataSize + 2);
  const view = new DataView(bytes.buffer);
  bytes[0] = 14;
  bytes[1] = 0x10;
  view.setUint32(4, dataSize, true);
  bytes.set([46, 70, 73, 84], 8);
  let o = 14;
  bytes[o++] = 0x40; // definition, local message 0
  bytes[o++] = 0; // reserved
  bytes[o++] = 0; // little endian
  view.setUint16(o, 20, true); o += 2; // global record message
  bytes[o++] = 2;
  bytes.set([253, 4, 0x86], o); o += 3; // timestamp uint32
  bytes.set([3, 1, 0x02], o); o += 3; // HR uint8
  for (const timestamp of timestamps) {
    bytes[o++] = 0;
    view.setUint32(o, timestamp, true); o += 4;
    bytes[o++] = 140;
  }
  return bytes.buffer;
}

describe("record-only FIT duration provenance", () => {
  it("accepts 61 timestamped samples spanning 60 real seconds", () => {
    const result = parseFitSummary(recordOnlyFit(Array.from({ length: 61 }, (_, i) => 1_000_000_000 + i)));
    expect(result.total_elapsed_time).toBe(60);
    expect(result.avg_heart_rate).toBe(140);
  });

  it("rejects repeated timestamps rather than treating 61 samples as 61 seconds", () => {
    expect(() => parseFitSummary(recordOnlyFit(Array(61).fill(1_000_000_000))))
      .toThrow(/below the 60s minimum/i);
  });

  it("rejects a corrupt multiyear span rather than substituting sample count", () => {
    const timestamps = Array.from({ length: 61 }, (_, i) => 1_000_000_000 + i);
    timestamps[0] = 1;
    expect(() => parseFitSummary(recordOnlyFit(timestamps)))
      .toThrow(/below the 60s minimum/i);
  });

  it("rejects a valid but short 59-second span regardless of sample count", () => {
    const timestamps = Array.from({ length: 120 }, (_, i) => 1_000_000_000 + (i % 60));
    expect(() => parseFitSummary(recordOnlyFit(timestamps)))
      .toThrow(/below the 60s minimum/i);
  });
});
