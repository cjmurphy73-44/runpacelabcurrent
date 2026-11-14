// @vitest-environment happy-dom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TodayFocusLine from "../TodayFocusLine";

const state = vi.hoisted(() => ({
  injury: { level: "none", loading: false, unavailable: false },
  dailyMetrics: [{ date: "2026-11-14", readiness_score: 85 }],
}));

vi.mock("@/hooks/useCoachInjurySignal", () => ({
  useCoachInjurySignal: () => state.injury,
}));
vi.mock("@/context/FitnessContext", () => ({
  useFitness: () => ({ dailyMetrics: state.dailyMetrics }),
}));

describe("TodayFocusLine coach restriction precedence", () => {
  beforeEach(() => {
    state.injury = { level: "none", loading: false, unavailable: false };
    state.dailyMetrics = [{ date: "2026-11-14", readiness_score: 85 }];
  });

  const renderFocus = () => render(<TodayFocusLine athlete={{ id: "test-athlete", current_tsb: 5 }} />);

  it("never green-lights running during an active hold despite high readiness", () => {
    state.injury = { level: "hold", loading: false, unavailable: false };
    renderFocus();
    expect(screen.getByText(/Running is paused under your current coach hold/)).toBeTruthy();
    expect(screen.queryByText(/Green light/)).toBeNull();
  });

  it("does not infer clearance while coach restrictions load", () => {
    state.injury = { level: "none", loading: true, unavailable: false };
    renderFocus();
    expect(screen.getByText(/Coaching restrictions are being checked/)).toBeTruthy();
    expect(screen.queryByText(/Green light/)).toBeNull();
  });

  it("does not infer clearance when coach status is unavailable", () => {
    state.injury = { level: "none", loading: false, unavailable: true };
    renderFocus();
    expect(screen.getByText(/Readiness alone does not establish clearance/)).toBeTruthy();
    expect(screen.queryByText(/Green light/)).toBeNull();
  });

  it("retains normal readiness guidance when no coach hold is active", () => {
    renderFocus();
    expect(screen.getByText(/Green light/)).toBeTruthy();
  });
});
