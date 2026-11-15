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

  it.each([undefined, null, {}, { success: true }, { success: true, created_count: 0 }, { success: true, created_count: 0, errors: null }])(
    "does not call an absent or malformed reply successful: %s",
    (reply) => {
      const result = summarizeBulkIngestResponse(reply);
      expect(result.created).toBe(0);
      expect(result.duplicates).toBe(0);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].error).toMatch(/could not be verified/i);
      expect(result.failures[0].error).toMatch(/before retrying/i);
    },
  );

  it.each([Infinity, NaN, -1, 1.5, "2", null])(
    "rejects unverifiable created counts: %s",
    (count) => {
      const result = summarizeBulkIngestResponse({ success: true, created_count: count, duplicate_count: 0, errors: [] });
      expect(result.created).toBe(0);
      expect(result.failures[0].error).toMatch(/could not be verified/i);
    },
  );

  it("preserves a legitimate all-duplicate batch as a nonfailure", () => {
    expect(summarizeBulkIngestResponse({
      success: true, created_count: 0, duplicate_count: 2,
      errors: [
        { file_name: "a.fit", error: "Skipped duplicate workout on 2026-11-15" },
        { file_name: "b.fit", error: "Skipped duplicate workout on 2026-11-15" },
      ],
    })).toEqual({ created: 0, duplicates: 2, failures: [] });
  });

  it("does not hide backend failures when the failed count exceeds details", () => {
    const outcome = summarizeBulkIngestResponse({
      success: false, created_count: 2, duplicate_count: 0, failed_count: 2,
      errors: [{ file_name: "bad.fit", error: "FIT file CRC failed" }],
    });
    expect(outcome.created).toBe(2);
    expect(outcome.failures).toHaveLength(2);
    expect(outcome.failures[1].error).toMatch(/without details/i);
  });

  it("retains explicit zero-result no-op responses", () => {
    expect(summarizeBulkIngestResponse({ success: true, created_count: 0, errors: [] }))
      .toEqual({ created: 0, duplicates: 0, failures: [] });
  });
});
