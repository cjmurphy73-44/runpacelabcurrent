// @vitest-environment happy-dom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CalendarSyncModule from "@/components/dashboard/CalendarSyncModule";
import { buildTrainingCalendarICS } from "@/lib/trainingCalendarICS";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("integrated one-time calendar export", () => {
  const workouts = [
    { id: "am", date: "2026-11-15", title: "Morning Run", prescribed_duration_minutes: 45 },
    { id: "pm", date: "2026-11-15", title: "Evening Strength", prescribed_duration_minutes: 30 },
  ];

  it("exports all same-day workouts in distinct ICS events without invented clock times", () => {
    const result = buildTrainingCalendarICS(workouts, { now: new Date("2026-11-15T00:00:00Z") });
    expect(result.exported).toBe(2);
    expect(result.content.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(result.content).toContain("UID:tpl-am@trainpacelab.com");
    expect(result.content).toContain("UID:tpl-pm@trainpacelab.com");
    expect(result.content).toContain("DTSTART;VALUE=DATE:20261115");
    expect(result.content).not.toContain("DTSTART:20261115T");
  });

  it("offers one-time ICS, not fake provider sync, and reports the exported count", () => {
    const create = vi.fn().mockReturnValue("blob:synthetic");
    const revoke = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const onSyncComplete = vi.fn();
    render(<CalendarSyncModule workouts={workouts} onSyncComplete={onSyncComplete} />);
    expect(screen.queryByText(/sync google calendar|copy webcal link/i)).toBeNull();
    expect(screen.getByText(/one-time export, not live synchronization/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Download calendar/i }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:synthetic");
    expect(onSyncComplete).toHaveBeenCalledWith({ format: "ics", count: 2, skipped: 0 });
    expect(screen.getByRole("status").textContent).toMatch(/Downloaded 2 sessions/i);
  });

  it("keeps export disabled without validly loaded workouts", () => {
    render(<CalendarSyncModule workouts={[]} />);
    expect(screen.getByRole("button", { name: /Download calendar/i }).disabled).toBe(true);
  });
});
