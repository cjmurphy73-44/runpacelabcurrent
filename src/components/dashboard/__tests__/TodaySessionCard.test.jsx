// @vitest-environment happy-dom
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import TodaySessionCard from "../TodaySessionCard";

const mocks = vi.hoisted(() => ({
  sessions: vi.fn(),
  plans: vi.fn(),
}));

vi.mock("@/api/base44Client", () => ({
  base44: { entities: {
    TrainingPlanSession: { filter: mocks.sessions },
    TrainingPlan: { filter: mocks.plans },
  } },
}));
vi.mock("@/context/FitnessContext", () => ({ useFitness: () => ({ biometricTelemetry: [] }) }));
vi.mock("@/hooks/useCoachInjurySignal", () => ({
  useCoachInjurySignal: () => ({ level: "none", loading: false }),
}));
vi.mock("@/components/dashboard/CoachHoldCard", () => ({ default: () => null }));
vi.mock("@/components/ui/ZoneBadge", () => ({ default: () => null }));

describe("Today's Session loading and recovery", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.plans.mockResolvedValue([]);
  });

  it("shows a retry action instead of a false rest day when loading fails", async () => {
    mocks.sessions.mockRejectedValue(new Error("network unavailable"));
    render(<TodaySessionCard athleteId="athlete-1" />);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/could not be loaded/i)).toBeTruthy();
    expect(screen.queryByText("Rest Day")).toBeNull();

    mocks.sessions.mockResolvedValue([{ sport: "running", prescribed_duration_minutes: 40, prescribed_intensity_zone: "Z2" }]);
    fireEvent.click(screen.getByRole("button", { name: /retry session/i }));
    await waitFor(() => expect(screen.getByText("40 min")).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mocks.sessions).toHaveBeenCalled();
  });

  it("shows a rest day only when a successful request returns no session", async () => {
    mocks.sessions.mockResolvedValue([]);
    render(<TodaySessionCard athleteId="athlete-2" />);
    expect(await screen.findByText("Rest Day")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
