import { describe, expect, it } from "vitest";
import { syncGuideFor, WEARABLE_MAP } from "../wearableCatalog";

describe("onboarding wearable sync guidance", () => {
  it("preserves provider order while removing duplicate selections", () => {
    expect(syncGuideFor(["garmin", "coros", "garmin", "apple_watch", "coros"]).map((w) => w.key))
      .toEqual(["garmin", "coros", "apple_watch"]);
  });

  it("ignores unknown and prototype-like values without rendering phantom providers", () => {
    const guide = syncGuideFor(["__proto__", "constructor", "toString", "unknown", null, 123, "coros"]);
    expect(guide.map((w) => w.key)).toEqual(["coros"]);
  });

  it("handles missing or malformed selections as empty guidance", () => {
    for (const selected of [undefined, null, "garmin", {}, 0]) {
      expect(syncGuideFor(selected)).toEqual([]);
    }
  });

  it("returns exactly one guidance item per selected known provider", () => {
    const guide = syncGuideFor(["polar", "polar", "apple_health"]);
    expect(guide.map((w) => w.key)).toEqual(["polar", "apple_health"]);
    expect(guide[0].instructions).toBe(WEARABLE_MAP.polar.instructions);
    expect(guide[1].status).toBe("manual_only");
  });
});
