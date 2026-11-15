import { describe, expect, it } from "vitest";
import { validateWorkoutImportDate } from "../../../base44/shared/workoutImportDate.ts";

const NOW = Date.parse("2026-11-15T01:00:00Z");

describe("single-file workout import calendar date", () => {
  it.each(["2026-11-15", "2024-02-29", "1970-01-01"])("accepts real calendar date %s", (date) => {
    expect(validateWorkoutImportDate(date, NOW)).toEqual({ ok: true });
  });

  it.each(["2025-02-29", "2026-02-30", "2026-04-31", "2026-00-01", "2026-13-01", "2026-11-00", "2026-11-32", "2026-1-5", "2026-11-15T00:00:00Z", "2026-11-15junk", "", "1969-12-31"])(
    "rejects invalid or noncanonical date %s", (date) => {
      expect(validateWorkoutImportDate(date, NOW)).toMatchObject({ ok: false });
    },
  );

  it.each([null, undefined, 20261115, {}, []])("rejects non-string date %s", (date) => {
    expect(validateWorkoutImportDate(date, NOW)).toMatchObject({ ok: false });
  });

  it("allows the next UTC day when still today in UTC+14", () => {
    expect(validateWorkoutImportDate("2026-11-16", Date.parse("2026-11-15T11:00:00Z"))).toEqual({ ok: true });
  });

  it("rejects a genuinely future day even with maximum timezone allowance", () => {
    expect(validateWorkoutImportDate("2026-11-17", NOW)).toMatchObject({
      ok: false, error: "date cannot be in the future",
    });
  });

  it("fails closed for invalid clock input", () => {
    expect(validateWorkoutImportDate("2026-11-15", NaN).ok).toBe(false);
  });
});
