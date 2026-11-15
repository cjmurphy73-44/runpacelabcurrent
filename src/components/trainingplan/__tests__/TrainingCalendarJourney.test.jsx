// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  filter: vi.fn(),
  invoke: vi.fn(),
  export: vi.fn(),
}));
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

describe("calendar seven-day athlete journey", () => {
  beforeEach(() => {
    cleanup();
    mocks.filter.mockReset();
    mocks.invoke.mockReset();
    mocks.export.mockReset();
  });

  it("renders every same-day prescription and exports the selected session", async () => {
    const date = moment().format("YYYY-MM-DD");
    mocks.filter.mockResolvedValue([
      { id: "am", date, sport: "running", title: "Morning easy run", start_time: "06:30", prescribed_duration_minutes: 45, prescribed_intensity_zone: "Z2", rationale_text: "Aerobic base", status: "planned" },
      { id: "pm", date, sport: "strength", title: "Evening strength", start_time: "18:00", prescribed_duration_minutes: 30, status: "planned" },
    ]);
    render(<TrainingCalendar athleteId="synthetic" currentTsb={0} />);
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
    render(<TrainingCalendar athleteId="synthetic" currentTsb={0} />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/could not load/i));
    expect(screen.getAllByText(/rest day not confirmed/i).length).toBe(7);
    expect(screen.queryByText("No sessions scheduled")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry calendar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    await waitFor(() => expect(screen.getAllByText("No sessions scheduled").length).toBe(7));
    expect(mocks.filter).toHaveBeenCalledTimes(2);
  });

  it("does not show the day as rest while loading", () => {
    mocks.filter.mockReturnValue(new Promise(() => {}));
    render(<TrainingCalendar athleteId="synthetic" currentTsb={0} />);
    expect(screen.getAllByText(/Loading scheduled sessions/i)).toHaveLength(7);
    expect(screen.queryByText("No sessions scheduled")).toBeNull();
  });
});
