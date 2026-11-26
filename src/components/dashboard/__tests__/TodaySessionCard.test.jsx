import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import moment from "moment";
import TodaySessionCard from "../TodaySessionCard";

vi.mock("@/context/FitnessContext", () => ({
  useFitness: () => ({ biometricTelemetry: [], dailyMetrics: [] }),
}));
vi.mock("@/hooks/useCoachInjurySignal", () => ({ useCoachInjurySignal: () => ({ level: "none", loading: false }) }));

const athlete = { id: "athlete-1" };
const emptySchedule = { plan: null, sessions: [], workoutBySession: {} };
const plan = { id: "plan-1" };

function showSchedule(schedule) {
  render(
    <MemoryRouter><TodaySessionCard athlete={athlete} schedule={schedule} /></MemoryRouter>,
  );
}

afterEach(cleanup);

it("directs athletes without an active plan to training plans", () => {
  showSchedule(emptySchedule);
  expect(screen.getByText("No active training plan yet.")).toBeTruthy();
  expect(screen.queryByText("Rest Day")).toBeNull();
  expect(screen.getByRole("link", { name: "Open training plans" }).getAttribute("href")).toBe("/plan");
});

it("shows a rest day for an active plan with no session scheduled today", () => {
  showSchedule({ ...emptySchedule, plan });
  expect(screen.getByText("Rest Day")).toBeTruthy();
});

it("leads with the pending session and links to the full multi-sport schedule", () => {
  const date = moment().format("YYYY-MM-DD");
  showSchedule({
    ...emptySchedule, plan,
    sessions: [
      { id: "done", date, sport: "cycling", status: "completed", prescribed_duration_minutes: 30 },
      { id: "next", date, sport: "running", status: "pending", prescribed_duration_minutes: 20 },
    ],
  });
  expect(screen.getByRole("heading", { name: "running" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "View all 2 sessions in Calendar" }).getAttribute("href")).toBe("/calendar");
});
