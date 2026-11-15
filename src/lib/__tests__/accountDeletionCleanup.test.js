import { describe, expect, it, vi } from "vitest";
import { runAccountEntityCleanup, finalizeAccountDeletion, linkedAthleteCleanup, resolveOwnedAthleteIds } from "../../../base44/shared/accountDeletionCleanup.js";

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

describe("account identity deletion gate", () => {
  it("never deletes User after any entity cleanup failure", async () => {
    const deleteUser = vi.fn();
    const result = await finalizeAccountDeletion([
      ["WorkoutAsset", vi.fn().mockRejectedValue(new Error("private internal error"))],
      ["WorkoutSession", vi.fn().mockResolvedValue(undefined)],
    ], deleteUser);
    expect(result).toEqual({ success: false, failedEntities: ["WorkoutAsset"] });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes User exactly once after all cleanup steps succeed", async () => {
    const deleteUser = vi.fn().mockResolvedValue(undefined);
    const result = await finalizeAccountDeletion([
      ["WorkoutAsset", vi.fn().mockResolvedValue(undefined)],
      ["WorkoutSession", vi.fn().mockResolvedValue(undefined)],
    ], deleteUser);
    expect(result).toEqual({ success: true, failedEntities: [] });
    expect(deleteUser).toHaveBeenCalledOnce();
  });

  it("does not report success if User deletion fails", async () => {
    const deleteUser = vi.fn().mockRejectedValue(new Error("identity deletion failed"));
    await expect(finalizeAccountDeletion([], deleteUser)).rejects.toThrow("identity deletion failed");
  });
});

describe("athlete ownership scoped account deletion", () => {
  it("uses every owned athlete profile even when user link is absent", () => {
    expect(resolveOwnedAthleteIds({ id: "owner" }, [
      { id: "athlete-a", created_by_id: "owner" },
      { id: "athlete-b", created_by_id: "owner" },
    ])).toEqual(["athlete-a", "athlete-b"]);
  });

  it("rejects foreign profiles and stale or foreign linked IDs", () => {
    expect(() => resolveOwnedAthleteIds({ id: "owner" }, [
      { id: "foreign", created_by_id: "other" },
    ])).toThrow(/ownership/);
    expect(() => resolveOwnedAthleteIds({
      id: "owner", data: { athlete_profile_id: "foreign" },
    }, [{ id: "mine", created_by_id: "owner" }])).toThrow(/linkage/);
    expect(() => resolveOwnedAthleteIds({
      id: "owner", athlete_profile_id: "foreign",
    }, [])).toThrow(/linkage/);
  });

  it("deletes service-created records only by verified athlete ID", async () => {
    const deleteMany = vi.fn().mockResolvedValue(undefined);
    const entities = new Proxy({}, {
      get: () => ({ deleteMany }),
    });
    const ids = resolveOwnedAthleteIds({
      id: "owner", athlete_profile_id: "mine",
    }, [{ id: "mine", created_by_id: "owner" }]);
    const result = await runAccountEntityCleanup(linkedAthleteCleanup(entities, ids));
    expect(result).toEqual([]);
    expect(deleteMany).toHaveBeenCalledWith({ athlete_id: "mine" });
    for (const [args] of deleteMany.mock.calls) {
      expect(args).toEqual({ athlete_id: "mine" });
    }
    expect(deleteMany.mock.calls.length).toBeGreaterThan(10);
  });

  it("creates no athlete-wide deletion work for an account without profiles", () => {
    const ids = resolveOwnedAthleteIds({ id: "owner" }, []);
    expect(linkedAthleteCleanup({}, ids)).toEqual([]);
  });
});
