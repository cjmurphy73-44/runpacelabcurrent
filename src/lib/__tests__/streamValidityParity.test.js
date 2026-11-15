import { describe, expect, it } from "vitest";
import { hasVerifiedStreams, analyticsEligible } from "../streamValidity";
import { isUsableTelemetry } from "../../../base44/shared/streamValidity";

const durationSeconds = 120;
const sessionWith = (sample, spacing = 1) => ({
  duration_seconds: durationSeconds,
  streams: Array.from({ length: 120 }, (_, i) => ({
    time: i * spacing,
    ...sample(i),
  })),
});

// Keep frontend display eligibility aligned with the backend ingest gate.
// These are synthetic measurements only: no SDK, provider or athlete calls.
describe("verified telemetry frontend/backend parity", () => {
  const cases = [
    ["continuous measured heart rate", sessionWith(() => ({ heart_rate: 145 })), true],
    ["continuous measured cycling power", sessionWith(() => ({ power: 205 })), true],
    ["complementary sparse channels", sessionWith((i) => i < 45 ? { heart_rate: 145 } : i < 90 ? { power: 205 } : {}), false],
    ["numeric-string heart-rate samples", sessionWith(() => ({ heart_rate: "145" })), false],
    ["non-finite power samples", sessionWith(() => ({ power: Infinity })), false],
    ["numeric-string timestamps", {
      duration_seconds: durationSeconds,
      streams: Array.from({ length: 120 }, (_, i) => ({ time: String(i), heart_rate: 145 })),
    }, false],
    ["exactly half covered by HR", sessionWith((i) => i < 60 ? { heart_rate: 145 } : {}), true],
    ["hidden 31-second recording gap despite dense average samples", {
      duration_seconds: 151,
      streams: Array.from({ length: 121 }, (_, i) => ({
        time: i + (i >= 60 ? 31 : 0),
        heart_rate: 145,
      })),
    }, false],
    ["30-second recording gap at accepted boundary", {
      duration_seconds: 150,
      streams: Array.from({ length: 121 }, (_, i) => ({
        time: i + (i >= 60 ? 29 : 0),
        heart_rate: 145,
      })),
    }, true],
    ["31-second pause with valid power and complete timestamps", {
      duration_seconds: 151,
      streams: Array.from({ length: 121 }, (_, i) => ({
        time: i + (i >= 60 ? 30 : 0),
        power: 220,
      })),
    }, false],
    ["two separate 20-second pauses stay within per-gap limit", {
      duration_seconds: 159,
      streams: Array.from({ length: 121 }, (_, i) => ({
        time: i + (i >= 40 ? 19 : 0) + (i >= 80 ? 19 : 0),
        heart_rate: 145,
      })),
    }, true],
    ["repeated timestamp after a pause", {
      duration_seconds: 150,
      streams: Array.from({ length: 121 }, (_, i) => ({
        time: i === 61 ? 89 : i + (i >= 60 ? 29 : 0),
        heart_rate: 145,
      })),
    }, false],
    ["non-finite timestamp within otherwise valid recording", {
      duration_seconds: 120,
      streams: Array.from({ length: 120 }, (_, i) => ({
        time: i === 60 ? Number.NaN : i,
        heart_rate: 145,
      })),
    }, false],
    ["sparse recorded intervals", sessionWith(() => ({ heart_rate: 145 }), 10), false],
    ["duration exceeds recorded span", { ...sessionWith(() => ({ heart_rate: 145 })), duration_seconds: 1000 }, false],
  ];

  it.each(cases)("%s", (_label, session, expected) => {
    const backend = isUsableTelemetry(session.streams, session.duration_seconds);
    expect(backend).toBe(expected);
    expect(hasVerifiedStreams(session)).toBe(backend);
    expect(analyticsEligible(session)).toBe(backend);
  });
});
