import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import BulkWorkoutImport from "../BulkWorkoutImport";

const { invoke, upload } = vi.hoisted(() => ({ invoke: vi.fn(), upload: vi.fn() }));
vi.mock("@/api/base44Client", () => ({
  base44: { functions: { invoke }, integrations: { Core: { UploadFile: upload } } },
}));

afterEach(cleanup);

it("links a confirmed workout from a partial batch and retries load without uploading again", async () => {
  upload.mockResolvedValue({ file_url: "https://example.test/workout.fit" });
  invoke
    .mockResolvedValueOnce({ data: {
      success: false, created_count: 1, workout_session_id: "saved-1",
      errors: [{ file_name: "invalid.fit", error: "Invalid workout file" }],
    } })
    .mockResolvedValueOnce({ data: { success: true, created_count: 0, duplicate_count: 1, errors: [] } })
    .mockRejectedValueOnce(new Error("load unavailable"))
    .mockResolvedValueOnce({ data: { success: true } });

  const { container } = render(
    <MemoryRouter><BulkWorkoutImport athleteId="athlete-1" /></MemoryRouter>,
  );
  const files = Array.from({ length: 6 }, (_, index) => new File(["FIT"], `${index}.fit`));
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files } });
  fireEvent.click(screen.getByRole("button", { name: /import 6 file/i }));

  expect((await screen.findByRole("link", { name: "Review imported workout" })).getAttribute("href")).toBe("/workouts/saved-1");
  expect(screen.getByText("Invalid workout file")).toBeTruthy();
  expect(invoke.mock.calls.map(([name]) => name)).toEqual([
    "bulkIngestWorkouts", "bulkIngestWorkouts", "recalculateCTLATLTSB",
  ]);
  fireEvent.click(await screen.findByRole("button", { name: "Retry training load" }));
  await screen.findByText("Training load updated.");
  expect(upload).toHaveBeenCalledTimes(6);
  expect(invoke).toHaveBeenLastCalledWith("recalculateCTLATLTSB", { athlete_id: "athlete-1" });
});
