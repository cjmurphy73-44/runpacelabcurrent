import { describe, expect, it } from "vitest";
import { singleFileImportOutcome } from "../singleFileImportOutcome";

describe("single workout import evidence and recovery", () => {
  it.each([undefined, null, {}, { success: true }, { success: true, attached: true }, { success: true, workout_session: {} }, { success: false }])(
    "does not claim a saved workout without evidence: %s",
    (response) => {
      const outcome = singleFileImportOutcome(response, "activity.fit");
      expect(outcome).toMatchObject({ type: "error", confirmed: false });
      expect(outcome.message).toMatch(/could not be verified/i);
      expect(outcome.message).toMatch(/before retrying/i);
    },
  );

  it("confirms a newly created session and explains separate stream coverage validation", () => {
    const outcome = singleFileImportOutcome({ success: true, workout_session: { id: "synthetic-session" } }, "run.fit");
    expect(outcome).toMatchObject({ type: "success", confirmed: true });
    expect(outcome.message).toMatch(/check workout details/i);
    expect(outcome.message).not.toMatch(/verified streams|zones calculated/i);
  });

  it("confirms an asset attached to an existing session without claiming a new session", () => {
    const outcome = singleFileImportOutcome({ success: true, attached: true, workout_session_id: "existing" }, "run.fit");
    expect(outcome).toMatchObject({ type: "success", confirmed: true });
    expect(outcome.message).toMatch(/no additional workout was created/i);
  });

  it("accepts positive server-confirmed CSV import counts", () => {
    expect(singleFileImportOutcome({ success: true, imported_sessions_count: 2 }, "workouts.csv"))
      .toMatchObject({ type: "success", confirmed: true });
  });

  it("does not treat zero writes or duplicates as a newly imported workout", () => {
    const duplicate = singleFileImportOutcome({
      success: true, imported_sessions_count: 0, skipped_duplicates: 2,
    }, "workouts.csv");
    expect(duplicate).toMatchObject({ type: "warning", confirmed: false });
    expect(singleFileImportOutcome({ success: true, imported_sessions_count: 0, skipped_duplicates: 0 }, "workouts.csv"))
      .toMatchObject({ type: "error", confirmed: false });
  });

  it.each([NaN, Infinity, -1, 1.5, "2", null])("rejects malformed CSV counts: %s", (count) => {
    expect(singleFileImportOutcome({ success: true, imported_sessions_count: count }, "workouts.csv"))
      .toMatchObject({ type: "error", confirmed: false });
  });

  it("offers original-FIT re-export guidance on an explicit integrity rejection", () => {
    const outcome = singleFileImportOutcome({ error: "File CRC mismatch" }, "activity.FIT");
    expect(outcome).toMatchObject({ type: "error", confirmed: false });
    expect(outcome.message).toMatch(/export a fresh original recording/i);
    expect(outcome.message).toMatch(/check your workout log before retrying/i);
  });

  it("does not claim that an unsupported chained FIT file was partially imported", () => {
    const outcome = singleFileImportOutcome({ error: "Chained FIT data is unsupported" }, "chain.fit");
    expect(outcome).toMatchObject({ type: "error", confirmed: false });
    expect(outcome.message).toMatch(/do not assume a partial recording was imported/i);
  });

  it("does not invent FIT re-export instructions for non-FIT files", () => {
    const outcome = singleFileImportOutcome({ error: "Invalid CSV row" }, "workouts.csv");
    expect(outcome.confirmed).toBe(false);
    expect(outcome.message).not.toMatch(/FIT file|original recording/i);
  });
});
