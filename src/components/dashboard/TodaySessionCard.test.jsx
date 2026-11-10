import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodaySessionCard from "./TodaySessionCard";
import { base44 } from "@/api/base44Client";

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      TrainingPlanSession: { filter: vi.fn() },
      TrainingPlan: { filter: vi.fn() },
    },
  },
}));

vi.mock("@/context/FitnessContext", () => ({
  useFitness: () => ({ biometricTelemetry: [] }),
}));

vi.mock("@/hooks/useCoachInjurySignal", () => ({
  useCoachInjurySignal: () => ({ level: "none", evidence: [] }),
}));

describe("TodaySessionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a retryable error when today's session data fails to load", async () => {
    base44.entities.TrainingPlanSession.filter
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce([]);
    base44.entities.TrainingPlan.filter.mockResolvedValue([]);

    render(<TodaySessionCard athleteId="athlete-1" />);

    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(await screen.findByText("Today's session couldn't load")).toBeTruthy();
    expect(screen.queryByText("Rest Day")).toBeNull();

    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry.tagName).toBe("BUTTON");
    retry.focus();
    expect(document.activeElement).toBe(retry);
    fireEvent.click(retry);
    expect(await screen.findByText("Rest Day")).toBeTruthy();
    await waitFor(() => expect(base44.entities.TrainingPlanSession.filter).toHaveBeenCalledTimes(2));
  });

  it("shows a genuine rest day when both requests succeed with no session", async () => {
    base44.entities.TrainingPlanSession.filter.mockResolvedValue([]);
    base44.entities.TrainingPlan.filter.mockResolvedValue([]);

    render(<TodaySessionCard athleteId="athlete-1" />);

    expect(await screen.findByText("Rest Day")).toBeTruthy();
    expect(screen.queryByText("Today's session couldn't load")).toBeNull();
  });
});
