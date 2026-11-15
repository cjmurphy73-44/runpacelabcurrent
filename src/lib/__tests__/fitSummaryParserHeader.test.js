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
});
