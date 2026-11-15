import { describe, expect, it } from "vitest";
import { parseFitSummary } from "../fitSummaryParser";

function fitHeader({ size = 12, dataSize = 0, signature = ".FIT", trailingBytes = 0 } = {}) {
  const bytes = new Uint8Array(size + trailingBytes + 2);
  const view = new DataView(bytes.buffer);
  bytes[0] = size;
  bytes[1] = 0x20;
  view.setUint32(4, dataSize, true);
  for (let i = 0; i < 4; i += 1) bytes[8 + i] = signature.charCodeAt(i);
  return bytes.buffer;
}


function syntheticFitSession(headerSize = 12) {
  // FIT 2.x framing: file header, one little-endian session definition,
  // one data message, then trailing file CRC bytes. No athlete data.
  const fields = [
    [253, 4, 0x86], // FIT epoch timestamp, uint32
    [7, 4, 0x86],   // elapsed time, milliseconds
    [9, 4, 0x86],   // distance, centimetres
    [16, 1, 0x02],  // average heart rate, uint8
    [5, 1, 0x00],   // sport, enum
  ];
  const dataLength = 1 + 5 + fields.length * 3 + 1 + 14;
  const bytes = new Uint8Array(headerSize + dataLength + 2);
  const view = new DataView(bytes.buffer);
  bytes[0] = headerSize;
  bytes[1] = 0x20;
  view.setUint32(4, dataLength, true);
  bytes.set([46, 70, 73, 84], 8); // .FIT
  let offset = headerSize;
  bytes[offset++] = 0x40; // local message 0 definition
  bytes[offset++] = 0;    // reserved
  bytes[offset++] = 0;    // little-endian architecture
  view.setUint16(offset, 18, true); offset += 2; // global session
  bytes[offset++] = fields.length;
  for (const field of fields) {
    bytes.set(field, offset);
    offset += 3;
  }
  bytes[offset++] = 0; // local message 0 data record
  view.setUint32(offset, 1100000000, true); offset += 4;
  view.setUint32(offset, 600000, true); offset += 4;
  view.setUint32(offset, 250000, true); offset += 4;
  bytes[offset++] = 145;
  bytes[offset++] = 1; // running
  if (offset !== headerSize + dataLength) throw new Error("Synthetic FIT fixture size mismatch");
  return bytes.buffer;
}

describe("browser FIT summary header validation", () => {
  it("rejects missing or too-short binary input before reading offsets", () => {
    for (const input of [undefined, null, new ArrayBuffer(0), new ArrayBuffer(11), new ArrayBuffer(13)]) {
      expect(() => parseFitSummary(input)).toThrow(/Invalid FIT header/);
    }
  });

  it("rejects invalid header size", () => {
    expect(() => parseFitSummary(fitHeader({ size: 13 }))).toThrow(/Invalid FIT header/);
  });

  it("rejects non-FIT binary payloads rather than interpreting them as workouts", () => {
    expect(() => parseFitSummary(fitHeader({ signature: "JUNK" }))).toThrow(/Invalid FIT header/);
  });

  it("rejects truncated declared record bodies", () => {
    expect(() => parseFitSummary(fitHeader({ dataSize: 100 }))).toThrow(/declared data exceeds file size/);
  });

  it("accepts both standard header layouts but still requires actual workout data", () => {
    for (const size of [12, 14]) {
      expect(() => parseFitSummary(fitHeader({ size }))).toThrow(/No session, lap, or record data/);
    }
  });
  it("decodes a synthetic FIT session through standard 12- and 14-byte headers", () => {
    const expectedTimestamp = new Date((1100000000 + 631065600) * 1000).toISOString();
    for (const headerSize of [12, 14]) {
      expect(parseFitSummary(syntheticFitSession(headerSize))).toEqual({
        timestamp: expectedTimestamp,
        total_distance_meters: 2500,
        total_elapsed_time: 600,
        avg_heart_rate: 145,
        max_heart_rate: null,
        sport: "running",
      });
    }
  });

});
