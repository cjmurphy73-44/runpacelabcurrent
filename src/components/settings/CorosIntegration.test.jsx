import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CorosIntegration from "./CorosIntegration";
import { base44 } from "@/api/base44Client";

vi.mock("@/api/base44Client", () => ({
  base44: { functions: { invoke: vi.fn() } },
}));

describe("CorosIntegration historical sync feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows partial imports and warns when a workout write outcome is unknown", async () => {
    base44.functions.invoke
      .mockResolvedValueOnce({ data: { connected: true } })
      .mockResolvedValueOnce({ data: {
        success: true,
        imported: 1,
        records_found: 2,
        errors: 1,
        recording_errors: [{ code: "workout_write_outcome_unknown", retryable: true }],
      } })
      .mockResolvedValueOnce({ data: { connected: true } });

    render(<CorosIntegration athleteId="synthetic-athlete" />);
    fireEvent.click(await screen.findByRole("button", { name: "Sync workouts" }));

    expect(await screen.findByText("Imported 1 of 2 found · 1 skipped.")).toBeTruthy();
    expect(screen.getByText(/1 workout write outcome\(s\) could not be confirmed; some may already be saved/)).toBeTruthy();
    await waitFor(() => expect(base44.functions.invoke).toHaveBeenCalledTimes(3));
  });
});
