import { describe, it, expect } from "vitest";
import { summarizeBulkIngestResponse } from "../bulkIngestOutcome";

describe("bulk import outcome", () => {
  it("retains created rows when backend reports partial failure", () => {
    expect(summarizeBulkIngestResponse({
      success: false, outcome: "partial", created_count: 3, duplicate_count: 1,
      errors: [
        { file_name: "old.fit", error: "Skipped duplicate workout on 2026-11-10" },
        { file_name: "bad.fit", error: "Insert failed: unavailable" },
      ],
    })).toEqual({
      created: 3, duplicates: 1,
      failures: [{ file_name: "bad.fit", error: "Insert failed: unavailable" }],
    });
  });

  it("does not call duplicate skips failures", () => {
    expect(summarizeBulkIngestResponse({
      success: true, created_count: 0, duplicate_count: 1,
      errors: [{ file_name: "repeat.fit", error: "Skipped duplicate workout on 2026-11-10" }],
    })).toEqual({ created: 0, duplicates: 1, failures: [] });
  });

  it("discloses failed inserts even when no per-file errors were returned", () => {
    const result = summarizeBulkIngestResponse({
      success: false, created_count: 0, errors: [], error: "Database unavailable",
    });
    expect(result.failures[0].error).toContain("Database unavailable");
    expect(result.created).toBe(0);
  });
});
