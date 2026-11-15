import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { base44 } from "@/api/base44Client";
import { useCoachInjurySignal } from "@/hooks/useCoachInjurySignal";
import TrainingPlan from "../TrainingPlan";

vi.mock("@/api/base44Client", () => ({
  base44: {
    auth: { me: vi.fn() },
    entities: {
      AthleteProfile: { get: vi.fn() },
      TrainingPlan: { filter: vi.fn() },
    },
    functions: { invoke: vi.fn() },
  },
}));
vi.mock("@/hooks/useCoachInjurySignal", () => ({ useCoachInjurySignal: vi.fn() }));
// Keep the page's safety UI and real commit button; omit unrelated plan rendering.
vi.mock("@/components/guide/HelpLink", () => ({ default: () => null }));
vi.mock("@/components/dashboard/OnboardingFlow", () => ({ default: () => null }));
vi.mock("@/components/trainingplan/TrainingPlanGenerator", () => ({ default: () => null }));
vi.mock("@/components/trainingplan/TrainingPlanTimeline", () => ({ default: () => null }));
vi.mock("@/components/trainingplan/TrainingPlanWeeklyBreakdown", () => ({ default: () => null }));
vi.mock("@/components/trainingplan/TrainingPlanExtras", () => ({ default: () => null }));

const draft = { id: "synthetic-draft", athlete_id: "synthetic-athlete", status: "draft", weekly_plans: [] };

describe("TrainingPlan coach-hold commit safety", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    base44.auth.me.mockResolvedValue({ id: "synthetic-user", data: { athlete_profile_id: draft.athlete_id } });
    base44.entities.AthleteProfile.get.mockResolvedValue({ id: draft.athlete_id });
    base44.entities.TrainingPlan.filter.mockImplementation(async ({ status }) => status === "draft" ? [draft] : []);
    base44.functions.invoke.mockResolvedValue({ data: { training_plan: { ...draft, status: "active" } } });
  });
  afterEach(cleanup);

  it.each([
    ["active hold", { level: "hold" }, /Running is paused by your coach hold/],
    ["unavailable", { level: "none", unavailable: true, error: "offline" }, /Confirm your current coaching status/],
    ["loading", { level: "none", loading: true }, /Confirm your current coaching status/],
  ])("blocks draft commit when coach state is %s", async (_label, state, reason) => {
    useCoachInjurySignal.mockReturnValue({
      loading: false, unavailable: false, evidence: [], summary: "Synthetic coach hold",
      reload: vi.fn(), clearHold: vi.fn(), ...state,
    });
    render(<MemoryRouter><TrainingPlan /></MemoryRouter>);

    const commit = await screen.findByRole("button", { name: "Confirm & Commit to Calendar" });
    expect(commit.disabled).toBe(true);
    expect(screen.getByText(reason).getAttribute("role")).toBe("status");
    if (state.level === "hold") {
      const warning = screen.getByText(/Historical plan only/);
      expect(warning.getAttribute("role")).toBe("status");
      expect(warning.textContent).toMatch(/running sessions and progression targets are paused/);
      expect(warning.textContent).toMatch(/Week targets are not instructions to resume running or guarantees of recovery/);
    }
    fireEvent.click(commit);
    expect(base44.functions.invoke).not.toHaveBeenCalled();
  });

  it("allows a verified no-hold draft to reach the mocked commit function", async () => {
    useCoachInjurySignal.mockReturnValue({ level: "none", loading: false, unavailable: false, evidence: [] });
    render(<MemoryRouter><TrainingPlan /></MemoryRouter>);
    const commit = await screen.findByRole("button", { name: "Confirm & Commit to Calendar" });
    expect(commit.disabled).toBe(false);
    fireEvent.click(commit);
    await waitFor(() => expect(base44.functions.invoke).toHaveBeenCalledExactlyOnceWith("commitTrainingPlan", { plan_id: draft.id }));
    await screen.findByRole("button", { name: "Generate New Plan" });
  });
});
