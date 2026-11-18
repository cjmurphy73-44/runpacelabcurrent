import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import HomeProgressPanel, { summarizeActivityProgress } from "../HomeProgressPanel";

const today = new Date("2026-11-18T12:00:00Z");
const workouts = [
  { date: "2026-11-18", duration_minutes: 45 },
  { date: "2026-11-17", duration_minutes: 60 },
  { date: "2026-11-17", duration_minutes: null },
  { date: "2026-11-01", duration_minutes: 30 },
  { date: "2026-11-18", duration_minutes: -4 },
  { date: "2026-11-19", duration_minutes: 99 },
];
describe("Home activity progress (synthetic only)", () => {
  it("separates session count from known duration and rejects invalid minutes", () => {
    const result = summarizeActivityProgress(workouts, today, 7);
    expect(result.sessions).toBe(4);
    expect(result.minutes).toBe(105);
    expect(result.missingDuration).toBe(2);
    expect(result.buckets).toHaveLength(7);
    expect(result.buckets.at(-1)).toMatchObject({ date: "2026-11-18", sessions: 2, minutes: 45 });
  });
  it("includes older activity only in the selected 28-day window", () => {
    const result = summarizeActivityProgress(workouts, today, 28);
    expect(result.sessions).toBe(5);
    expect(result.minutes).toBe(135);
  });
  it("renders accessible range controls and truthful missing-duration explanation", () => {
    const html = renderToStaticMarkup(<MemoryRouter><HomeProgressPanel workouts={workouts} today={today} /></MemoryRouter>);
    expect(html).toContain('aria-label="Activity history range"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("2 sessions without verified duration");
    expect(html).toContain("Recorded duration, not fitness or training load.");
    expect(html).toContain("Review all workouts");
  });
  it("discloses when the backend query caps history", () => {
    const html = renderToStaticMarkup(<MemoryRouter><HomeProgressPanel workouts={workouts} today={today} historyLimited /></MemoryRouter>);
    expect(html).toContain("Older sessions may be missing from this comparison.");
  });
  it("renders a useful no-data recovery state", () => {
    const html = renderToStaticMarkup(<MemoryRouter><HomeProgressPanel workouts={[]} today={today} /></MemoryRouter>);
    expect(html).toContain("No saved sessions in this period");
    expect(html).not.toContain("without verified duration");
  });
});
