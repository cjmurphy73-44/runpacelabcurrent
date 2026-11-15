import { describe, expect, it } from "vitest";
import { parseFitSummary } from "../fitSummaryParser";

// Independent bitwise CRC-16 test oracle (Garmin FIT, reflected 0xA001).
// Header golden vector is from Garmin's published CheckIntegrity example.
function referenceFitCrc(bytes, end) {
  let crc = 0;
  for (let i = 0; i < end; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xA001 : 0);
    }
  }
  return crc;
}

function finalizeFitChecksums(bytes) {
  const view = new DataView(bytes.buffer);
  if (bytes[0] === 14) view.setUint16(12, referenceFitCrc(bytes, 12), true);
  view.setUint16(bytes.length - 2, referenceFitCrc(bytes, bytes.length - 2), true);
}

function fitHeader({ size = 12, dataSize = 0, signature = ".FIT", trailingBytes = 0 } = {}) {
  const bytes = new Uint8Array(size + trailingBytes + 2);
  const view = new DataView(bytes.buffer);
  bytes[0] = size;
  bytes[1] = 0x20;
  view.setUint32(4, dataSize, true);
  for (let i = 0; i < 4; i += 1) bytes[8 + i] = signature.charCodeAt(i);
  finalizeFitChecksums(bytes);
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
  finalizeFitChecksums(bytes);
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
  it("rejects chained complete FIT files instead of silently returning the first session", () => {
    const first = new Uint8Array(syntheticFitSession(12));
    const second = new Uint8Array(syntheticFitSession(14));
    const chained = new Uint8Array(first.length + second.length);
    chained.set(first);
    chained.set(second, first.length);
    expect(() => parseFitSummary(chained.buffer)).toThrow(/chained or appended FIT data/i);
  });

  it("rejects unexplained trailing bytes beyond the declared FIT CRC", () => {
    const original = new Uint8Array(syntheticFitSession(14));
    const appended = new Uint8Array(original.length + 3);
    appended.set(original);
    appended.set([0x40, 0, 0], original.length);
    expect(() => parseFitSummary(appended.buffer)).toThrow(/chained or appended FIT data/i);
  });

  it("matches Garmin's published 14-byte header CRC golden vector", () => {
    const header = Uint8Array.from([0x0E, 0x10, 0x43, 0x08, 0x78, 0x06, 0x09, 0, 0x2E, 0x46, 0x49, 0x54]);
    expect(referenceFitCrc(header, header.length)).toBe(0x8596);
  });

  it("rejects corrupt FIT data before returning a trusted workout summary", () => {
    for (const headerSize of [12, 14]) {
      const bytes = new Uint8Array(syntheticFitSession(headerSize));
      bytes[headerSize + 7] ^= 1; // flip an elapsed-time field, leave CRC unchanged
      expect(() => parseFitSummary(bytes.buffer)).toThrow(/Invalid FIT file CRC/);
    }
  });

  it("rejects a corrupt 14-byte header CRC", () => {
    const bytes = new Uint8Array(syntheticFitSession(14));
    bytes[12] ^= 1; // corrupt only header checksum
    expect(() => parseFitSummary(bytes.buffer)).toThrow(/Invalid FIT header CRC/);
  });

  it("permits an omitted optional header CRC only when the file CRC is correct", () => {
    const bytes = new Uint8Array(syntheticFitSession(14));
    bytes[12] = 0; bytes[13] = 0;
    finalizeFitChecksums(bytes);
    expect(parseFitSummary(bytes.buffer).sport).toBe("running");
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
