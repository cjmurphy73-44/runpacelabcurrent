import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { base44 } from "@/api/base44Client";
import { useCoachInjurySignal } from "@/hooks/useCoachInjurySignal";
import HomeTrainingWorkspace from "../HomeTrainingWorkspace";

vi.mock("@/api/base44Client", () => ({ base44: {
  entities: {
    TrainingPlanSession: { filter: vi.fn() }, TrainingPlan: { filter: vi.fn() },
    DailyMetrics: { filter: vi.fn().mockResolvedValue([]) },
  },
  functions: { invoke: vi.fn() },
} }));
vi.mock("@/hooks/useCoachInjurySignal", () => ({ useCoachInjurySignal: vi.fn() }));
vi.mock("@/context/FitnessContext", () => ({ useFitness: () => ({ biometricTelemetry: [], dailyMetrics: [] }) }));
// The existing readiness card owns its computation. Here we verify navigation
// to it; session, hold and workout detail UI remain real components.
vi.mock("../ReadinessScoreCard", () => ({ default: () => <h2>Existing readiness score</h2> }));

const athlete = { id: "synthetic-athlete", first_name: "Alex", resting_hr: 60, max_heart_rate: 190, current_ctl: 42, current_tsb: 5 };
const workout = { id: "synthetic-ride", date: "2026-11-14", sport: "cycling", duration_minutes: 45, distance_km: 20, avg_hr: 130 };
const session = { sport: "running", prescribed_duration_minutes: 40, prescribed_intensity_zone: "Z2" };
const clearState = { level: "none", loading: false, unavailable: false, evidence: [], reload: vi.fn(), clearHold: vi.fn() };

function mount(workouts = [workout]) {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/app" element={<HomeTrainingWorkspace athlete={athlete} workouts={workouts} />} />
        {["plan", "recovery", "workouts", "settings"].map((path) => <Route key={path} path={`/${path}`} element={<h1>{path} destination</h1>} />)}
      </Routes>
    </MemoryRouter>
  );
}

function selectTab(name) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
}

describe("Home daily training workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCoachInjurySignal.mockReturnValue(clearState);
    base44.entities.TrainingPlanSession.filter.mockResolvedValue([session]);
    base44.entities.TrainingPlan.filter.mockResolvedValue([{ id: "synthetic-plan" }]);
  });
  afterEach(cleanup);

  it("starts on today's session with one next action to the training plan", async () => {
    mount();
    expect(screen.getByRole("heading", { level: 1, name: /Alex/ })).toBeTruthy();
    expect(screen.getByText("Fitness")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("Form")).toBeTruthy();
    expect(screen.getByText("+5")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Today" }).getAttribute("aria-selected")).toBe("true");
    expect(await screen.findByRole("heading", { name: "running" })).toBeTruthy();
    expect(screen.getByText("40 min")).toBeTruthy();
    expect(screen.queryByText("Existing readiness score")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: /Today.s plan/ }));
    expect(screen.getByRole("heading", { name: "plan destination" })).toBeTruthy();
  });


  it("shows a real running context and retains one primary plan link on mobile", async () => {
    const oldRun = { ...workout, id: "historical-run", date: "2026-09-20", sport: "running", distance_km: 8 };
    mount([workout, oldRun]);
    await screen.findByRole("heading", { name: "running" });
    expect(screen.getByRole("heading", { name: "What the data says" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Running capability/ })).toBeTruthy();
    expect(screen.getByText("Current pace unverified")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Today.s plan/ })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Explore race-based paces/ })).toBeTruthy();
    expect(base44.functions.invoke).not.toHaveBeenCalled();
  });
  it("switches to readiness in place and links to recovery", async () => {
    mount();
    await screen.findByRole("heading", { name: "running" });
    selectTab("Readiness");
    expect(screen.getByRole("heading", { name: "Existing readiness score" })).toBeTruthy();
    expect(screen.getByText("Training form (TSB)")).toBeTruthy();
    expect(screen.getByText((text) => text.startsWith("+5.0 training-load balance"))).toBeTruthy();
    expect(screen.queryByRole("link", { name: /View training plan/ })).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: /Explore recovery/ }));
    expect(screen.getByRole("heading", { name: "recovery destination" })).toBeTruthy();
  });

  it("supports keyboard movement through the daily views", async () => {
    mount();
    await screen.findByRole("heading", { name: "running" });
    const today = screen.getByRole("tab", { name: "Today" });
    act(() => today.focus());
    fireEvent.keyDown(today, { key: "ArrowRight" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Readiness" })));
    expect(screen.getByRole("tab", { name: "Readiness" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.activeElement, { key: "End" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Last workout" })));
  });

  it("opens the newest saved workout's real interpretation dialog without leaving Home", async () => {
    const older = { ...workout, id: "older", date: "2026-11-12", sport: "swimming" };
    const input = [older, workout];
    mount(input);
    await screen.findByRole("heading", { name: "running" });
    selectTab("Last workout");
    fireEvent.click(screen.getByRole("button", { name: /Review last workout/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /2026-11-14 cycling/ })).toBeTruthy();
    expect(within(dialog).getByText("Avg HR")).toBeTruthy();
    expect(within(dialog).getByText("130 bpm")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.getByRole("tab", { name: "Last workout" }).getAttribute("aria-selected")).toBe("true");
    expect(input[0]).toBe(older);
    expect(base44.functions.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("link", { name: /All workouts/ }));
    expect(screen.getByRole("heading", { name: "workouts destination" })).toBeTruthy();
  });

  it("keeps an active coach hold visible across all three views without showing a run target", async () => {
    useCoachInjurySignal.mockReturnValue({ ...clearState, level: "hold", summary: "Running remains paused by your coach." });
    mount();
    expect(await screen.findByText("Running paused")).toBeTruthy();
    expect(screen.queryByText(/great day for a quality session/)).toBeNull();
    await screen.findByText(/Today's 40 min Z2 run is swapped/);
    expect(screen.queryByRole("heading", { name: "running" })).toBeNull();
    for (const name of ["Readiness", "Last workout", "Today"]) {
      selectTab(name);
      expect(screen.getByText("Running paused")).toBeTruthy();
      expect(screen.getByRole("link", { name: /Talk to coach/ }).getAttribute("href")).toBe("/coach");
      if (name === "Today") await screen.findByText(/Today's 40 min Z2 run is swapped/);
    }
    expect(clearState.clearHold).not.toHaveBeenCalled();
    expect(base44.functions.invoke).not.toHaveBeenCalled();
  });

  it.each([
    [{ loading: true }, /Checking your coaching status/],
    [{ unavailable: true }, /Coaching status unavailable/],
  ])("preserves unknown coaching status when navigating away from today", async (state, message) => {
    useCoachInjurySignal.mockReturnValue({ ...clearState, ...state });
    mount();
    await screen.findByRole("heading", { name: "running" });
    selectTab("Readiness");
    expect(screen.getByText(message)).toBeTruthy();
    selectTab("Last workout");
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText("No active coach hold.")).toBeNull();
  });

  it("offers watch connection instead of an interpretation when history is empty", async () => {
    base44.entities.TrainingPlanSession.filter.mockResolvedValue([]);
    mount([]);
    expect(await screen.findByText("Rest Day")).toBeTruthy();
    selectTab("Last workout");
    expect(screen.getByText("No saved workouts yet")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Review last workout/ })).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Connect a watch" }));
    expect(screen.getByRole("heading", { name: "settings destination" })).toBeTruthy();
  });
});
