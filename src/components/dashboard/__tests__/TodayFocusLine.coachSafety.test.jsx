import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCoachInjurySignal } from "@/hooks/useCoachInjurySignal";
import TodayFocusLine from "../TodayFocusLine";

vi.mock("@/hooks/useCoachInjurySignal", () => ({ useCoachInjurySignal: vi.fn() }));
vi.mock("@/context/FitnessContext", () => ({
  useFitness: () => ({ dailyMetrics: [{ date: "2026-11-15", readiness_score: 88 }] }),
}));

const athlete = { id: "synthetic-athlete", current_tsb: 5 };
const verifiedClear = { level: "none", loading: false, error: null, unavailable: false };

describe("Today focus coach clearance safety", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows training focus only when coach status is verified clear", () => {
    useCoachInjurySignal.mockReturnValue(verifiedClear);
    render(<TodayFocusLine athlete={athlete} />);
    expect(screen.getByText(/Green light/)).toBeTruthy();
  });

  it.each([
    [{ ...verifiedClear, level: "hold" }, /Running is paused by your coach hold/],
    [{ ...verifiedClear, loading: true }, /Confirm your current coaching status/],
    [{ ...verifiedClear, unavailable: true }, /Confirm your current coaching status/],
    [{ ...verifiedClear, error: "unavailable" }, /Confirm your current coaching status/],
  ])("never encourages training during a hold or unknown coach status", (status, expected) => {
    useCoachInjurySignal.mockReturnValue(status);
    render(<TodayFocusLine athlete={athlete} />);
    expect(screen.getByRole("status").textContent).toMatch(expected);
    expect(screen.queryByText(/Green light/)).toBeNull();
    expect(screen.queryByText(/train as planned/i)).toBeNull();
  });
});
