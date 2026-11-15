import { describe, expect, it, vi } from "vitest";
import { runAccountEntityCleanup } from "../../../base44/shared/accountDeletionCleanup.js";

describe("account deletion cleanup executor", () => {
  it("reports no failures when every entity deletion succeeds", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    expect(await runAccountEntityCleanup([["WorkoutSession", remove]])).toEqual([]);
    expect(remove).toHaveBeenCalledOnce();
  });

  it("attempts remaining entity deletions and returns only failed entity labels", async () => {
    const removeSession = vi.fn().mockRejectedValue(new Error("secret database details"));
    const removePlan = vi.fn().mockResolvedValue(undefined);
    const removeAsset = vi.fn().mockRejectedValue(new Error("private storage path"));
    const failures = await runAccountEntityCleanup([
      ["WorkoutSession", removeSession],
      ["TrainingPlan", removePlan],
      ["WorkoutAsset", removeAsset],
    ]);
    expect(failures).toEqual(["WorkoutSession", "WorkoutAsset"]);
    expect(JSON.stringify(failures)).not.toMatch(/secret|private storage/);
    expect(removePlan).toHaveBeenCalledOnce();
  });

  it("allows idempotent retry after a transient partial failure", async () => {
    const removeSession = vi.fn().mockRejectedValueOnce(new Error("temporary")).mockResolvedValue(undefined);
    const removePlan = vi.fn().mockResolvedValue(undefined);
    const cleanup = [["WorkoutSession", removeSession], ["TrainingPlan", removePlan]];
    expect(await runAccountEntityCleanup(cleanup)).toEqual(["WorkoutSession"]);
    expect(await runAccountEntityCleanup(cleanup)).toEqual([]);
    expect(removePlan).toHaveBeenCalledTimes(2);
  });
});
