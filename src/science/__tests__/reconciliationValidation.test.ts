import { describe, expect, it } from "vitest";
import { reconcileTelemetryStream } from "../reconciliation";

describe("reconcileTelemetryStream", () => {
  it("does not claim synchronized before any recording arrives", () => {
    expect(reconcileTelemetryStream({ power: [], hr: [], timestamps: [] }))
      .toEqual({ alignedPoints: [], status: "pending" });
  });

  it("preserves actual aligned samples, including legitimate zero power", () => {
    expect(reconcileTelemetryStream({
      power: [0, 210], hr: [120, 125], timestamps: [100, 101],
    })).toEqual({
      alignedPoints: [
        { power: 0, hr: 120, ts: 100 },
        { power: 210, hr: 125, ts: 101 },
      ],
      status: "synchronized",
    });
  });

  it("rejects unequal arrays rather than filling absent values with zero", () => {
    expect(reconcileTelemetryStream({
      power: [210, 220], hr: [130], timestamps: [100, 101],
    })).toEqual({ alignedPoints: [], status: "error" });
  });

  it("rejects invalid, duplicate or decreasing timestamps", () => {
    for (const timestamps of [[100, 100], [101, 100], [100, NaN]]) {
      expect(reconcileTelemetryStream({ power: [200, 210], hr: [120, 125], timestamps }).status)
        .toBe("error");
    }
  });

  it("rejects invalid physiological values without inventing clean measurements", () => {
    expect(reconcileTelemetryStream({
      power: [200, Infinity], hr: [120, 125], timestamps: [100, 101],
    }).status).toBe("error");
  });
});
