import { describe, expect, it } from "vitest";
import { normalizedPacePower } from "../workoutAnalytics";

describe("workout pace display rounding", () => {
  it("carries rounded 60 seconds into the next minute", () => {
    expect(normalizedPacePower({ sport: "running", duration_seconds: 299.7, distance_km: 1 })).toBe("5:00 /km");
    expect(normalizedPacePower({ sport: "running", duration_seconds: 359.99, distance_km: 1 })).toBe("6:00 /km");
  });
  it("shows ordinary pace values without losing seconds", () => {
    expect(normalizedPacePower({ sport: "running", duration_seconds: 267, distance_km: 1 })).toBe("4:27 /km");
    expect(normalizedPacePower({ sport: "running", duration_seconds: 300, distance_km: 1 })).toBe("5:00 /km");
  });
  it("does not invent pace without a valid distance and duration", () => {
    expect(normalizedPacePower({ sport: "running", duration_seconds: 300, distance_km: 0 })).toBe("—");
    expect(normalizedPacePower({ sport: "running", duration_seconds: 300, distance_km: -1 })).toBe("—");
    expect(normalizedPacePower({ sport: "running", duration_seconds: 300, distance_km: Number.NaN })).toBe("—");
    expect(normalizedPacePower({ sport: "running", duration_seconds: 0.001, distance_km: 999 })).toBe("—");
  });
  it("rounds subsecond boundaries without generating a 60-second component", () => {
    expect(normalizedPacePower({ sport: "running", duration_seconds: 299.49, distance_km: 1 })).toBe("4:59 /km");
    expect(normalizedPacePower({ sport: "running", duration_seconds: 299.5, distance_km: 1 })).toBe("5:00 /km");
    expect(normalizedPacePower({ sport: "running", duration_seconds: 3600, distance_km: 1 })).toBe("60:00 /km");
  });
  it("uses supplied duration in minutes consistently with seconds", () => {
    expect(normalizedPacePower({ sport: "running", duration_minutes: 4.995, distance_km: 1 })).toBe("5:00 /km");
    expect(normalizedPacePower({ sport: "running", duration_seconds: 599.4, distance_km: 2 })).toBe("5:00 /km");
  });
  it("never shows Infinity, NaN, or negative cycling speed", () => {
    expect(normalizedPacePower({ sport: "cycling", duration_seconds: 1200, distance_km: -10 })).toBe("—");
    expect(normalizedPacePower({ sport: "cycling", duration_seconds: -1200, distance_km: 10 })).toBe("—");
    expect(normalizedPacePower({ sport: "cycling", duration_seconds: Number.NaN, distance_km: 10 })).toBe("—");
    expect(normalizedPacePower({ sport: "cycling", duration_seconds: 1200, distance_km: Number.POSITIVE_INFINITY })).toBe("—");
  });
  it("rejects invalid measured power rather than displaying Infinity W", () => {
    expect(normalizedPacePower({ sport: "cycling", avg_power: Number.POSITIVE_INFINITY })).toBe("—");
    expect(normalizedPacePower({ sport: "cycling", avg_power: -200 })).toBe("—");
    expect(normalizedPacePower({ sport: "cycling", avg_power: 220 })).toBe("220 W");
  });
  it("handles missing workouts and avoids displaying zero watts for tiny positive readings", () => {
    expect(normalizedPacePower(null)).toBe("—");
    expect(normalizedPacePower(undefined)).toBe("—");
    expect(normalizedPacePower({ sport: "cycling", avg_power: 0.1 })).toBe("—");
    expect(normalizedPacePower({ sport: "cycling", avg_power: 0.5 })).toBe("1 W");
  });
  it("leaves measured power and cycling speed output unchanged", () => {
    expect(normalizedPacePower({ sport: "cycling", avg_power: 220, duration_seconds: 1200, distance_km: 10 })).toBe("220 W");
    expect(normalizedPacePower({ sport: "cycling", duration_seconds: 1200, distance_km: 10 })).toBe("30.0 km/h");
  });
});
