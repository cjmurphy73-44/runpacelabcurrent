// @vitest-environment happy-dom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const sdk = vi.hoisted(() => ({
  upload: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    integrations: { Core: { UploadFile: sdk.upload } },
    functions: { invoke: sdk.invoke },
  },
}));

// Keep this a component behavior test, independent of Radix portal machinery.
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));
vi.mock("@/components/ui/input", () => ({
  Input: React.forwardRef((props, ref) => <input ref={ref} {...props} />),
}));
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }) => <label {...props}>{children}</label>,
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }) => <div>{children}</div>,
  SelectTrigger: ({ children }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }) => <section>{children}</section>,
  CardHeader: ({ children }) => <header>{children}</header>,
  CardTitle: ({ children }) => <h2>{children}</h2>,
  CardContent: ({ children }) => <div>{children}</div>,
}));

import WorkoutUpload from "../WorkoutUpload";

function selectSyntheticFit(container) {
  const file = new File(["synthetic FIT payload"], "activity.fit", { type: "application/octet-stream" });
  fireEvent.change(container.querySelector('input[type="file"]'), {
    target: { files: [file] },
  });
  return file;
}

describe("single-file upload UI acceptance", () => {
  beforeEach(() => {
    cleanup();
    sdk.upload.mockReset();
    sdk.invoke.mockReset();
    sdk.upload.mockResolvedValue({ file_url: "https://example.invalid/fixture.fit" });
  });

  it("preserves the retry action and does not emit success after an unknown response", async () => {
    const onUploaded = vi.fn();
    sdk.invoke.mockResolvedValue({ data: undefined });
    const { container } = render(<WorkoutUpload athleteId="synthetic-athlete" onUploaded={onUploaded} />);
    const upload = screen.getByRole("button", { name: "Upload" });
    expect(upload.disabled).toBe(true);
    selectSyntheticFit(container);
    expect(upload.disabled).toBe(false);
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/could not be verified/i));
    expect(screen.getByRole("status").textContent).toMatch(/before retrying/i);
    expect(upload.disabled).toBe(false);
    expect(onUploaded).not.toHaveBeenCalled();
    expect(sdk.invoke).toHaveBeenCalledTimes(1);
    expect(sdk.invoke).toHaveBeenCalledWith("ingestWorkoutFile", expect.objectContaining({
      athlete_id: "synthetic-athlete", file_name: "activity.fit",
    }));
  });

  it("confirms an actual persisted session, then disables repeat submission", async () => {
    const onUploaded = vi.fn();
    sdk.invoke.mockResolvedValue({ data: { success: true, workout_session: { id: "saved-session" } } });
    const { container } = render(<WorkoutUpload athleteId="synthetic-athlete" onUploaded={onUploaded} />);
    selectSyntheticFit(container);
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Workout saved/i));
    expect(onUploaded).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Upload" }).disabled).toBe(true);
  });

  it("rejects a damaged FIT file without claiming a partial import or clearing retry", async () => {
    const onUploaded = vi.fn();
    sdk.invoke.mockResolvedValue({ data: { error: "FIT file CRC mismatch" } });
    const { container } = render(<WorkoutUpload athleteId="synthetic-athlete" onUploaded={onUploaded} />);
    selectSyntheticFit(container);
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/export a fresh original recording/i));
    expect(screen.getByRole("status").textContent).toMatch(/do not assume a partial recording was imported/i);
    expect(screen.getByRole("button", { name: "Upload" }).disabled).toBe(false);
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("clears the native file picker after confirmed save and accepts the same file again", async () => {
    const onUploaded = vi.fn();
    sdk.invoke.mockResolvedValue({ data: { success: true, workout_session: { id: "saved-session" } } });
    const { container } = render(<WorkoutUpload athleteId="synthetic-athlete" onUploaded={onUploaded} />);
    const input = container.querySelector('input[type="file"]');
    selectSyntheticFit(container);
    // happy-dom does not set the browser's fakepath for synthetic file selections.
    // Emulate that native input state to verify the explicit DOM reset.
    Object.defineProperty(input, "value", { configurable: true, writable: true, value: "C:\\\\fakepath\\\\activity.fit" });
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(input.value).toBe("");
    expect(screen.getByRole("button", { name: "Upload" }).disabled).toBe(true);
    selectSyntheticFit(container);
    expect(screen.getByRole("button", { name: "Upload" }).disabled).toBe(false);
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(2));
  });

  it("preserves the selected file and warns after an interrupted backend response", async () => {
    const onUploaded = vi.fn();
    sdk.invoke.mockRejectedValue(new Error("socket disconnected"));
    const { container } = render(<WorkoutUpload athleteId="synthetic-athlete" onUploaded={onUploaded} />);
    const input = container.querySelector('input[type="file"]');
    selectSyntheticFit(container);
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/outcome could not be verified/i));
    expect(screen.getByRole("status").textContent).toMatch(/check your workout log before retrying/i);
    expect(screen.getByRole("status").textContent).not.toMatch(/socket disconnected|saved successfully/i);
    expect(screen.getByRole("button", { name: "Upload" }).disabled).toBe(false);
    expect(input.files[0].name).toBe("activity.fit");
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("preserves the selected file after upload transport failure without invoking ingest", async () => {
    const onUploaded = vi.fn();
    sdk.upload.mockRejectedValue(new Error("transport offline"));
    const { container } = render(<WorkoutUpload athleteId="synthetic-athlete" onUploaded={onUploaded} />);
    selectSyntheticFit(container);
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/before retrying/i));
    expect(sdk.invoke).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Upload" }).disabled).toBe(false);
  });

  it("reports a duplicate-only import without firing the new-workout callback", async () => {
    const onUploaded = vi.fn();
    sdk.invoke.mockResolvedValue({ data: { success: true, imported_sessions_count: 0, skipped_duplicates: 1 } });
    const { container } = render(<WorkoutUpload athleteId="synthetic-athlete" onUploaded={onUploaded} />);
    selectSyntheticFit(container);
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/duplicate workout/i));
    expect(onUploaded).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Upload" }).disabled).toBe(false);
  });
});
