// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  filter: vi.fn(),
  invoke: vi.fn(),
  export: vi.fn(),
  authUser: { id: "synthetic-user-A" },
}));
vi.mock("@/lib/AuthContext", () => ({ useAuth: () => ({ user: mocks.authUser }) }));
vi.mock("@/api/base44Client", () => ({
  base44: { entities: { TrainingPlanSession: { filter: mocks.filter } }, functions: { invoke: mocks.invoke } },
}));
vi.mock("@/services/workoutExport", () => ({ downloadWorkoutFile: mocks.export }));
vi.mock("@/hooks/useCoachInjurySignal", () => ({ useCoachInjurySignal: () => ({ level: "none" }) }));
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ plan: "free" }) }));
vi.mock("@/components/dashboard/CoachHoldCard", () => ({ default: () => null }));
vi.mock("@/components/billing/FeatureGate", () => ({ default: ({ children }) => <>{children}</> }));
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }) => <section>{children}</section>,
  CardHeader: ({ children }) => <header>{children}</header>,
  CardTitle: ({ children }) => <h3>{children}</h3>,
  CardContent: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

import moment from "moment";
import TrainingCalendar from "@/components/dashboard/TrainingCalendar";

function renderCalendar(props = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = (nextProps = props) => (
    <QueryClientProvider client={client}>
      <TrainingCalendar athleteId="synthetic" currentTsb={0} {...nextProps} />
    </QueryClientProvider>
  );
  const result = render(view());
  return { ...result, client, update: (nextProps) => result.rerender(view(nextProps)) };
}

describe("calendar seven-day athlete journey", () => {
  beforeEach(() => {
    cleanup();
    mocks.filter.mockReset();
    mocks.invoke.mockReset();
    mocks.export.mockReset();
    mocks.authUser = { id: "synthetic-user-A" };
  });

  it("renders every same-day prescription and exports the selected session", async () => {
    const date = moment().format("YYYY-MM-DD");
    mocks.filter.mockResolvedValue([
      { id: "am", date, sport: "running", title: "Morning easy run", start_time: "06:30", prescribed_duration_minutes: 45, prescribed_intensity_zone: "Z2", rationale_text: "Aerobic base", status: "planned" },
      { id: "pm", date, sport: "strength", title: "Evening strength", start_time: "18:00", prescribed_duration_minutes: 30, status: "planned" },
    ]);
    renderCalendar();
    await waitFor(() => expect(screen.getByText("Morning easy run")).toBeTruthy());
    expect(screen.getByText("Evening strength")).toBeTruthy();
    expect(screen.getByText("Session 1 of 2")).toBeTruthy();
    expect(screen.getByText("Session 2 of 2")).toBeTruthy();
    const buttons = screen.getAllByRole("button", { name: /export workout/i });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]);
    expect(mocks.export).toHaveBeenCalledTimes(1);
    expect(mocks.export.mock.calls[0][0].id).toBe("pm");
    expect(mocks.filter).toHaveBeenCalledWith({ athlete_id: "synthetic" });
  });

  it("never turns a failed query into seven confirmed rest days, and recovers on Retry", async () => {
    mocks.filter.mockRejectedValueOnce(new Error("synthetic outage")).mockResolvedValueOnce([]);
    renderCalendar();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/could not load/i));
    expect(screen.getAllByText(/rest day not confirmed/i).length).toBe(7);
    expect(screen.queryByText("No sessions scheduled")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry calendar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    await waitFor(() => expect(screen.getAllByText("No sessions scheduled").length).toBe(7));
    expect(mocks.filter).toHaveBeenCalledTimes(2);
  });

  it("offers the real one-time calendar export and retains every session at narrow mobile widths", async () => {
    const date = moment().format("YYYY-MM-DD");
    mocks.filter.mockResolvedValue([
      { id: "double-am", date, title: "Easy run", sport: "running", prescribed_duration_minutes: 40 },
      { id: "double-pm", date, title: "Evening mobility", sport: "strength", prescribed_duration_minutes: 25 },
    ]);
    for (const width of [320, 390, 768]) {
      cleanup();
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      const { container } = renderCalendar();
      await waitFor(() => expect(screen.getByText("Easy run")).toBeTruthy());
      expect(screen.getByText("Evening mobility")).toBeTruthy();
      expect(screen.getByRole("button", { name: /download calendar \(\.ics\)/i })).toBeTruthy();
      expect(screen.getByText(/one-time export, not live synchronization/i)).toBeTruthy();
      expect(container.querySelector(".grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4")).toBeTruthy();
    }
  });

  it("does not claim adjustment success when the backend response is unknown", async () => {
    mocks.filter.mockResolvedValue([]);
    mocks.invoke.mockResolvedValue({ data: {} });
    renderCalendar({ currentTsb: 3 });
    const adjust = await screen.findByRole("button", { name: /AI Microadjustment/i });
    await waitFor(() => expect(adjust.disabled).toBe(false));
    fireEvent.click(adjust);
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/could not be confirmed/i));
    expect(mocks.filter).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status").textContent).not.toMatch(/Adjustment confirmed/i);
  });

  it("confirms an adjustment only after refreshed schedule evidence", async () => {
    mocks.filter.mockResolvedValue([]);
    mocks.invoke.mockResolvedValue({ data: { success: true, adjusted: [{ id: "mock-adjustment" }] } });
    renderCalendar({ currentTsb: 3 });
    const adjust = await screen.findByRole("button", { name: /AI Microadjustment/i });
    await waitFor(() => expect(adjust.disabled).toBe(false));
    fireEvent.click(adjust);
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Adjustment confirmed/i));
    expect(mocks.filter).toHaveBeenCalledTimes(2);
  });

  it("previews a pending workout move on mobile without calling any write API", async () => {
    const today = moment().format("YYYY-MM-DD");
    const tomorrow = moment().add(1, "day").format("YYYY-MM-DD");
    mocks.filter.mockResolvedValue([{
      id: "pending-move", training_plan_id: "plan-one", athlete_id: "synthetic",
      date: today, sport: "running", status: "pending", prescribed_duration_minutes: 40,
    }]);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    renderCalendar();
    const preview = await screen.findByRole("button", { name: "Preview reschedule" });
    expect(preview.className).toContain("min-h-11");
    fireEvent.click(preview);
    expect(screen.getByText(/cannot save or move a workout/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Proposed new date"), { target: { value: tomorrow } });
    fireEvent.click(screen.getByRole("button", { name: "Check proposed move" }));
    expect(screen.getByRole("status").textContent).toMatch(/Not saved. Your calendar remains unchanged/i);
    expect(screen.getByText(/running/i)).toBeTruthy();
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.filter).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancel move preview" }));
    expect(screen.queryByText(/cannot save or move a workout/i)).toBeNull();
  });

  it("reveals only server-supplied target details and structured steps on a touch-sized control", async () => {
    const date = moment().format("YYYY-MM-DD");
    mocks.filter.mockResolvedValue([{
      id: "structured-run", date, sport: "running", title: "Intervals",
      prescribed_duration_minutes: 50, prescribed_intensity_zone: "Z4",
      target_hr_low: 145, target_hr_high: 165, target_pace: "4:30/km",
      description: "Warm up, intervals, cooldown",
      structured_steps: [
        { order: 0, type: "warmup", duration_seconds: 600, description: "Easy pace" },
        { order: 1, type: "interval", duration_seconds: 180, description: "Controlled hard" },
      ],
    }]);
    renderCalendar();
    await waitFor(() => expect(screen.getByText("Intervals")).toBeTruthy());
    const show = screen.getByRole("button", { name: "View session details" });
    expect(show.className).toContain("min-h-11");
    expect(show.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(show);
    expect(screen.getByText(/Target pace: 4:30\/km/i)).toBeTruthy();
    expect(screen.getByText(/145 to 165 bpm/i)).toBeTruthy();
    expect(screen.getByText(/Warm up, intervals, cooldown/i)).toBeTruthy();
    expect(screen.getByText(/180 sec/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hide session details" }).getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Hide session details" }));
    expect(screen.queryByText(/145 to 165 bpm/i)).toBeNull();
  });

  it("never displays another account's cached sessions after account switch", async () => {
    const day = moment().format("YYYY-MM-DD");
    mocks.filter.mockResolvedValueOnce([{ id: "old-user-session", date: day, title: "Private A workout" }])
      .mockResolvedValueOnce([{ id: "new-user-session", date: day, title: "Private B workout" }]);
    const view = renderCalendar();
    await waitFor(() => expect(screen.getByText("Private A workout")).toBeTruthy());
    mocks.authUser = { id: "synthetic-user-B" };
    view.update();
    expect(screen.queryByText("Private A workout")).toBeNull();
    await waitFor(() => expect(screen.getByText("Private B workout")).toBeTruthy());
    expect(screen.queryByText("Private A workout")).toBeNull();
    expect(view.client.getQueryData(["athlete-plan", "synthetic-user-A", "synthetic", "week", day])).toHaveLength(1);
    expect(view.client.getQueryData(["athlete-plan", "synthetic-user-B", "synthetic", "week", day])).toHaveLength(1);
  });

  it("blocks unauthenticated calendar access without backend requests or fake rest days", () => {
    mocks.authUser = null;
    renderCalendar();
    expect(mocks.filter).not.toHaveBeenCalled();
    expect(screen.getByText(/Sign in to view your scheduled training/i)).toBeTruthy();
    expect(screen.queryByText("No sessions scheduled")).toBeNull();
    expect(screen.getByRole("button", { name: /AI Microadjustment/i }).disabled).toBe(true);
  });

  it("cannot export stale workouts after a failed refresh", async () => {
    const day = moment().format("YYYY-MM-DD");
    mocks.filter.mockResolvedValueOnce([{ id: "old", date: day, title: "Old plan" }])
      .mockRejectedValueOnce(new Error("refresh offline"));
    const view = renderCalendar();
    await waitFor(() => expect(screen.getByText("Old plan")).toBeTruthy());
    await view.client.invalidateQueries({ queryKey: ["athlete-plan", "synthetic-user-A", "synthetic"] });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/last loaded schedule/i));
    expect(screen.getByText(/Last loaded prescription, not a verified current schedule/i)).toBeTruthy();
    expect(screen.getAllByText(/No current schedule confirmed for this day/i)).toHaveLength(6);
    expect(screen.queryByText("No sessions scheduled")).toBeNull();
    expect(screen.queryByRole("button", { name: /Download calendar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Export Workout/i })).toBeNull();
    expect(screen.getByRole("button", { name: /AI Microadjustment/i }).disabled).toBe(true);
  });

  it("does not show the day as rest while loading", () => {
    mocks.filter.mockReturnValue(new Promise(() => {}));
    renderCalendar();
    expect(screen.getAllByText(/Loading scheduled sessions/i)).toHaveLength(7);
    expect(screen.queryByText("No sessions scheduled")).toBeNull();
  });
});
