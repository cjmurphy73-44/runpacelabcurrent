// @vitest-environment happy-dom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { filter } = vi.hoisted(() => ({ filter: vi.fn() }));
vi.mock("@/api/base44Client", () => ({
  base44: { entities: {
    TrainingPlanSession: { filter },
    WorkoutSession: { filter },
  } },
}));
import WeeklyVolumeLine from "../WeeklyVolumeLine";

afterEach(() => { cleanup(); filter.mockReset(); });

describe("weekly volume dashboard trust", () => {
  it("shows an actionable error instead of silently hiding a failed request", async () => {
    filter.mockRejectedValue(new Error("offline"));
    render(<WeeklyVolumeLine athleteId="synthetic-athlete" />);
    expect(await screen.findByText(/Weekly volume unavailable/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("retries after failure and renders confirmed values", async () => {
    filter.mockRejectedValueOnce(new Error("offline"));
    filter.mockRejectedValueOnce(new Error("offline"));
    render(<WeeklyVolumeLine athleteId="synthetic-athlete" />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText(/This week:/)).toBeTruthy());
    expect(screen.queryByText(/Weekly volume unavailable/)).toBeNull();
  });
});
