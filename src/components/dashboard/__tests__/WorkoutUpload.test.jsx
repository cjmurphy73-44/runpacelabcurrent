// @vitest-environment happy-dom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  ingest: vi.fn(),
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    integrations: { Core: { UploadFile: mocks.upload } },
    functions: { invoke: mocks.ingest },
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));
vi.mock("@/components/ui/input", () => ({
  Input: React.forwardRef((props, ref) => <input ref={ref} {...props} />),
}));
vi.mock("@/components/ui/label", () => ({
  Label: ({ children }) => <label>{children}</label>,
}));
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardTitle: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }) => <div>{children}</div>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children }) => <div>{children}</div>,
  SelectTrigger: ({ children }) => <div>{children}</div>,
  SelectValue: () => <span>Running</span>,
}));

import WorkoutUpload from "../WorkoutUpload";

function chooseFile() {
  const input = document.querySelector('input[type="file"]');
  const file = new File(["synthetic FIT"], "synthetic.fit", { type: "application/octet-stream" });
  fireEvent.change(input, { target: { files: [file] } });
  return input;
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Upload" }));
}

describe("single-file import input lifecycle", () => {
  beforeEach(() => {
    mocks.upload.mockReset().mockResolvedValue({ file_url: "https://example.invalid/synthetic.fit" });
    mocks.ingest.mockReset();
  });
  afterEach(() => cleanup());

  it("preserves the selected native file and avoids success callback when persistence is unverified", async () => {
    mocks.ingest.mockResolvedValue({ data: { success: true } });
    const onUploaded = vi.fn();
    render(<WorkoutUpload athleteId="synthetic-athlete" onUploaded={onUploaded} />);
    const input = chooseFile();
    submit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/could not be verified/i));
    expect(input.files).toHaveLength(1);
    expect(input.value).not.toBe("");
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("clears native file input after confirmed saved workout and invokes callback once", async () => {
    mocks.ingest.mockResolvedValue({ data: { success: true, workout_session: { id: "synthetic-session" } } });
    const onUploaded = vi.fn();
    render(<WorkoutUpload athleteId="synthetic-athlete" onUploaded={onUploaded} />);
    const input = chooseFile();
    submit();
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(input.value).toBe("");
    expect(input.files).toHaveLength(0);
    expect(screen.getByRole("status").textContent).toMatch(/Workout saved/i);
  });

  it("preserves the selected file and shows FIT recovery on explicit corrupt FIT rejection", async () => {
    mocks.ingest.mockResolvedValue({ data: { error: "CRC mismatch" } });
    const onUploaded = vi.fn();
    render(<WorkoutUpload athleteId="synthetic-athlete" onUploaded={onUploaded} />);
    const input = chooseFile();
    submit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/export a fresh original recording/i));
    expect(input.files).toHaveLength(1);
    expect(onUploaded).not.toHaveBeenCalled();
  });
  it("warns that an interrupted ingest may have persisted and retains the selected file", async () => {
    mocks.ingest.mockRejectedValue(new Error("network timeout with sensitive details"));
    const onUploaded = vi.fn();
    render(<WorkoutUpload athleteId="synthetic-athlete" onUploaded={onUploaded} />);
    const input = chooseFile();
    submit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/check your workout history before retrying/i));
    expect(screen.getByRole("status").textContent).not.toMatch(/network timeout|saved successfully/i);
    expect(input.files).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Upload" }).disabled).toBe(false);
    expect(onUploaded).not.toHaveBeenCalled();
    expect(mocks.ingest).toHaveBeenCalledTimes(1);
  });

  it("distinguishes a failed file transfer before ingest from an uncertain server save", async () => {
    mocks.upload.mockRejectedValue(new Error("private upload transport failure"));
    const onUploaded = vi.fn();
    render(<WorkoutUpload athleteId="synthetic-athlete" onUploaded={onUploaded} />);
    const input = chooseFile();
    submit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/failed before workout processing began/i));
    expect(screen.getByRole("status").textContent).not.toMatch(/private upload transport failure|workout save could not be confirmed/i);
    expect(input.files).toHaveLength(1);
    expect(mocks.ingest).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

});
