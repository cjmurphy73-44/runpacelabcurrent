// @vitest-environment happy-dom
import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RecordingIntervals from "../RecordingIntervals";

vi.mock("@/lib/streamValidity", () => ({ hasVerifiedStreams: vi.fn(() => true) }));
vi.mock("@/lib/recordingIntervals", () => ({ recordingIntervals: vi.fn() }));
import { recordingIntervals } from "@/lib/recordingIntervals";
import { hasVerifiedStreams } from "@/lib/streamValidity";

const intervals = [
  { index: 1, startSeconds: 0, durationSeconds: 300, avgHr: 130, avgSpeedKmh: 12, hrCoverage: 1, distanceKm: 1 },
  { index: 2, startSeconds: 300, durationSeconds: 300, avgHr: null, avgSpeedKmh: 0, hrCoverage: 0.1, distanceKm: 0 },
  { index: 3, startSeconds: 600, durationSeconds: 300, avgHr: 151, avgSpeedKmh: null, hrCoverage: 1, distanceKm: null },
];
function setup(rows = intervals) {
  hasVerifiedStreams.mockReturnValue(true);
  recordingIntervals.mockReturnValue(rows);
  return render(<RecordingIntervals workout={{ id: "fixture", streams: [] }} />);
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("RecordingIntervals chart interactions", () => {
  it("defaults to heart rate, announces selected measured interval, and does not treat missing HR as zero", () => {
    setup();
    expect(screen.getByRole("button", { name: "Heart rate" }).getAttribute("aria-pressed")).toBe("true");
    const missing = screen.getByRole("button", { name: /5:00 to 10:00: measurement unavailable/ });
    expect(missing.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /10:00 to 15:00: 151 bpm/ }));
    expect(screen.getByText(/10:00–15:00 · 151 bpm average/)).toBeTruthy();
  });
  it("switches to speed, preserves genuine zero speed, and resets selection", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /0:00 to 5:00: 130 bpm/ }));
    fireEvent.click(screen.getByRole("button", { name: "Speed" }));
    expect(screen.getByRole("button", { name: "Speed" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/Select a measured interval/)).toBeTruthy();
    const zero = screen.getByRole("button", { name: /5:00 to 10:00: 0 km\/h/ });
    expect(zero.disabled).toBe(false);
    fireEvent.click(zero);
    expect(screen.getByText(/5:00–10:00 · 0 km\/h average/)).toBeTruthy();
  });
  it("shows a truthful empty measurement state instead of zero-valued bars", () => {
    setup(intervals.map(w => ({ ...w, avgHr: null })));
    expect(screen.getByRole("status").textContent).toMatch(/No verified heart-rate measurements/);
    expect(screen.queryByRole("group", { name: "Heart-rate interval chart" })).toBeNull();
  });
  it("supports interval window selection and keyboard-operable native controls", () => {
    setup();
    const select = screen.getByRole("combobox", { name: "Recording interval window in minutes" });
    fireEvent.change(select, { target: { value: "5" } });
    expect(recordingIntervals).toHaveBeenCalledWith(expect.objectContaining({ id: "fixture" }), 300);
    expect(screen.getByRole("button", { name: "Speed" }).tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: /0:00 to 5:00: 130 bpm/ }).tagName).toBe("BUTTON");
  });
  it("does not present charts for unverified streams", () => {
    hasVerifiedStreams.mockReturnValue(false);
    render(<RecordingIntervals workout={{ id: "unverified" }} />);
    expect(screen.queryByText("Interval trends")).toBeNull();
    expect(recordingIntervals).not.toHaveBeenCalled();
  });
});
