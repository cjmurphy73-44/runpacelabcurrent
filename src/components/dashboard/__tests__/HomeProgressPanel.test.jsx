import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import HomeProgressPanel, { summarizeActivityProgress } from "../HomeProgressPanel";

const today = new Date(2026, 10, 18, 12, 0, 0);
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
  it("uses the athlete browser local calendar at midnight, not the UTC date", () => {
    const localMidnight = new Date(2026, 10, 19, 0, 5, 0);
    const result = summarizeActivityProgress([{ date: "2026-11-19", duration_minutes: 25 }], localMidnight, 7);
    expect(result.buckets.at(-1)).toMatchObject({ date: "2026-11-19", sessions: 1, minutes: 25 });
  });
  it("preserves date-only records as local calendar dates", () => {
    const result = summarizeActivityProgress([{ date: "2026-11-18", duration_minutes: 20 }], today, 7);
    expect(result.buckets.at(-1)).toMatchObject({ date: "2026-11-18", sessions: 1, minutes: 20 });
  });
  it("maps UTC timestamp instants to browser-local days", () => {
    const instant = "2026-11-18T23:30:00Z";
    const local = new Date(instant);
    const day = [local.getFullYear(), String(local.getMonth() + 1).padStart(2, "0"), String(local.getDate()).padStart(2, "0")].join("-");
    const result = summarizeActivityProgress([{ date: instant, duration_minutes: 40 }], new Date(2026, 10, 19, 12), 7);
    expect(result.buckets.find(bucket => bucket.date === day)?.minutes).toBe(40);
  });
  it("does not silently treat malformed timestamps as saved calendar days", () => {
    const result = summarizeActivityProgress([{ date: "2026-11-18TbadZ", duration_minutes: 40 }], today, 7);
    expect(result.sessions).toBe(0);
  });
  it("includes older activity only in the selected 28-day window", () => {
    const result = summarizeActivityProgress(workouts, today, 28);
    expect(result.sessions).toBe(5);
    expect(result.minutes).toBe(135);
    expect(result.buckets).toHaveLength(28);
    expect(result.buckets[0].date).toBe("2026-10-22");
  });
  it("keeps the selected window independent of history truncation warnings", () => {
    const seven = summarizeActivityProgress(workouts, today, 7);
    const twentyEight = summarizeActivityProgress(workouts, today, 28);
    expect(seven.sessions).toBe(4);
    expect(twentyEight.sessions).toBe(5);
    expect(seven.buckets).toHaveLength(7);
    expect(twentyEight.buckets).toHaveLength(28);
  });
  it("renders accessible range controls and truthful missing-duration explanation", () => {
    const html = renderToStaticMarkup(<MemoryRouter><HomeProgressPanel workouts={workouts} today={today} /></MemoryRouter>);
    expect(html).toContain('aria-label="Activity history range"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("2 sessions without usable duration");
    expect(html).toContain("Saved session duration by local calendar date, not fitness or training load.");
    expect(html).toContain("Review all workouts");
  });
  it("exposes the same daily records as a semantic table for keyboard and screen reader users", () => {
    const html = renderToStaticMarkup(<MemoryRouter><HomeProgressPanel workouts={workouts} today={today} /></MemoryRouter>);
    expect(html).toContain("<details");
    expect(html).toContain("View daily activity breakdown");
    expect(html).toContain("<table");
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html).toContain("Date (local)");
    expect(html).toContain("2026-11-17");
    expect(html).toContain("Known minutes");
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
