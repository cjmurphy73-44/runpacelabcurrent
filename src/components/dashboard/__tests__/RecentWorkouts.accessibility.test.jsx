import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }) => <section>{children}</section>,
  CardHeader: ({ children }) => <header>{children}</header>,
  CardTitle: ({ children }) => <h2>{children}</h2>,
  CardContent: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }) => <span>{children}</span> }));
vi.mock("@/components/workout/WorkoutDetailModal", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("@/lib/workoutLoadPresentation", () => ({
  workoutLoadPresentation: () => ({ amount: "42 TRIMP", label: "Measured recording" }),
}));
import RecentWorkouts from "../RecentWorkouts";

describe("recent workout accessible trigger", () => {
  it("renders keyboard-operable buttons with useful labels", () => {
    const html = renderToStaticMarkup(<RecentWorkouts workouts={[{
      id: "synthetic", date: "2026-11-14", sport: "running", duration_minutes: 45,
    }]} />);
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="View running details for 2026-11-14"');
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain("42 TRIMP");
  });
  it("renders a usable empty state with missing workouts prop", () => {
    const html = renderToStaticMarkup(<RecentWorkouts />);
    expect(html).toContain("No workouts logged yet.");
    expect(html).not.toContain('type="button"');
  });
});
