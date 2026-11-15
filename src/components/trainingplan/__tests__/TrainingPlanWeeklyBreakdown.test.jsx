// @vitest-environment happy-dom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }) => <section>{children}</section>,
  CardHeader: ({ children }) => <header>{children}</header>,
  CardTitle: ({ children }) => <h2>{children}</h2>,
  CardContent: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }) => <span>{children}</span>,
}));

import TrainingPlanWeeklyBreakdown from "../TrainingPlanWeeklyBreakdown";
import { localPlanDate } from "@/lib/planWeekNavigation";

describe("mobile-friendly plan week navigation", () => {
  it("opens the actual current week, highlights today's workout, and allows keyboard-toggle navigation", () => {
    const today = localPlanDate();
    const weeks = [
      { week_number: 1, theme: "Earlier", totals: "90 min", days: [{ date: "2020-01-01", day_name: "Monday", title: "Past run" }] },
      { week_number: 2, theme: "Current week", totals: "120 min", days: [
        { date: today, day_name: "Today day", title: "Easy 40 minutes", prescribed_duration_minutes: 40, prescribed_intensity_zone: "Z2", description: "Comfortable aerobic pace" },
      ] },
    ];
    const { container } = render(<TrainingPlanWeeklyBreakdown weeklyPlans={weeks} />);
    const currentWeek = screen.getByRole("button", { name: /week 2, current week/i });
    const priorWeek = screen.getByRole("button", { name: /week 1, earlier/i });
    expect(currentWeek.getAttribute("aria-expanded")).toBe("true");
    expect(priorWeek.getAttribute("aria-expanded")).toBe("false");
    expect(within(container.querySelector("#training-week-2")).getByText("Easy 40 minutes")).toBeTruthy();
    expect(within(container.querySelector("#training-week-2")).getByText("Today")).toBeTruthy();
    expect(currentWeek.className).toContain("min-h-11");
    fireEvent.click(priorWeek);
    expect(priorWeek.getAttribute("aria-expanded")).toBe("true");
    expect(currentWeek.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Past run")).toBeTruthy();
    fireEvent.click(priorWeek);
    expect(priorWeek.getAttribute("aria-expanded")).toBe("false");
  });
});
