import { describe, expect, it } from "vitest";
import { analyticsEligible, hasVerifiedStreams } from "./streamValidity";

const recording = (sample, count = 120) => ({
  duration_seconds: count,
  streams: Array.from({ length: count }, (_, i) => ({
    time: i,
    ...sample(i),
  })),
});

describe("frontend verified recording eligibility", () => {
  const cases = [
    ["dense numeric heart rate", recording(() => ({ heart_rate: 142 })), true],
    ["dense numeric power", recording(() => ({ power: 230 })), true],
    ["fragmented channels with neither at 50%", recording((i) => i % 5 === 0 ? {} : i % 2 ? { power: 180 } : { heart_rate: 140 }), false],
    ["string heart rate is not measured telemetry", recording(() => ({ heart_rate: "140" })), false],
    ["no physiological channel", recording(() => ({})), false],
    ["nonfinite physiological values", recording(() => ({ heart_rate: Infinity, power: NaN })), false],
    ["fewer than 60 samples", recording(() => ({ heart_rate: 140 }), 59), false],
    ["sparse sample timestamps", { ...recording(() => ({ heart_rate: 140 })), streams: Array.from({ length: 120 }, (_, i) => ({ time: i * 10, heart_rate: 140 })) }, false],
    ["exactly half of samples in one channel", recording((i) => i < 60 ? { heart_rate: 140 } : {}), true],
    ["span cannot substantiate duration", { ...recording(() => ({ heart_rate: 140 })), duration_seconds: 1000 }, false],
  ];

  it.each(cases)("%s", (_label, session, expected) => {
    expect(hasVerifiedStreams(session)).toBe(expected);
    expect(analyticsEligible(session)).toBe(expected);
  });
});
