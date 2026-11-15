import { describe, expect, it } from "vitest";
import { resolvePreviewIdentity } from "../src/lib/app-params.js";

const published = "6a504ebe6a5a6d1be058226c";
const staging = "aaaaaaaaaaaaaaaaaaaaaaaa";
const valid = { required: true, expectedAppId: staging, configuredAppId: staging, publishedAppId: published };

describe("preview-only runtime Base44 identity", () => {
  it("preserves production compatibility when the preview guard is disabled", () => {
    expect(resolvePreviewIdentity({ required: false })).toEqual({ enforced: false });
  });
  it("selects only the explicitly configured staging app despite stale production storage", () => {
    expect(resolvePreviewIdentity({ ...valid, storedAppId: published })).toEqual({ enforced: true, appId: staging });
  });
  it("permits a matching Base44 plugin identity", () => {
    expect(resolvePreviewIdentity({ ...valid, pluginAppId: staging })).toEqual({ enforced: true, appId: staging });
  });
  it("permits a matching OAuth redirect app ID", () => {
    expect(resolvePreviewIdentity({ ...valid, urlAppId: staging })).toEqual({ enforced: true, appId: staging });
  });
  it.each([
    [{ ...valid, expectedAppId: undefined }],
    [{ ...valid, expectedAppId: published, configuredAppId: published }],
    [{ ...valid, configuredAppId: published }],
    [{ ...valid, configuredAppId: undefined }],
    [{ ...valid, pluginAppId: published }],
    [{ ...valid, pluginAppId: "not-an-id" }],
    [{ ...valid, urlAppId: published }],
    [{ ...valid, urlAppId: "bbbbbbbbbbbbbbbbbbbbbbbb" }],
    [{ ...valid, expectedAppId: "invalid" }],
  ])("fails closed on missing or conflicting preview identity", (input) => {
    expect(() => resolvePreviewIdentity(input)).toThrow(/Preview identity blocked/);
  });
});
