import { describe, expect, it } from "vitest";
import { assertPreviewBuildConfig } from "../scripts/assert-preview-build-config.mjs";

const valid = {
  VERCEL_ENV: "preview",
  VITE_STAGING_PREVIEW_REQUIRED: "true",
  VITE_STAGING_APP_ID: "aaaaaaaaaaaaaaaaaaaaaaaa",
  PRODUCTION_BASE44_APP_ID: "6a504ebe6a5a6d1be058226c",
  VITE_APP_ID: "aaaaaaaaaaaaaaaaaaaaaaaa",
  VITE_APP_BASE_URL: "https://staging-example.base44.app",
  VITE_PRODUCTION_BASE44_BASE_URL: "https://production-example.base44.app",
};

describe("Vercel preview build fail-closed opt-in", () => {
  it("leaves production and local builds unchanged", () => {
    expect(() => assertPreviewBuildConfig({ VERCEL_ENV: "production" })).not.toThrow();
    expect(() => assertPreviewBuildConfig({})).not.toThrow();
  });
  it("accepts an explicitly configured synthetic preview", () => {
    expect(() => assertPreviewBuildConfig(valid)).not.toThrow();
  });
  it.each([
    [{ ...valid, VITE_STAGING_PREVIEW_REQUIRED: undefined }],
    [{ ...valid, VITE_STAGING_PREVIEW_REQUIRED: "false" }],
    [{ ...valid, VITE_APP_ID: undefined }],
    [{ ...valid, PRODUCTION_BASE44_APP_ID: undefined }],
    [{ ...valid, VITE_STAGING_APP_ID: valid.PRODUCTION_BASE44_APP_ID, VITE_APP_ID: valid.PRODUCTION_BASE44_APP_ID }],
    [{ ...valid, VITE_BASE44_APP_BASE_URL: valid.VITE_PRODUCTION_BASE44_BASE_URL }],
    [{ ...valid, VITE_APP_BASE_URL: undefined }],
    [{ ...valid, VITE_PRODUCTION_BASE44_BASE_URL: undefined }],
    [{ ...valid, VITE_BASE44_APP_ID: "bbbbbbbbbbbbbbbbbbbbbbbb" }],
  ])("blocks an incomplete or contradictory preview build", (config) => {
    expect(() => assertPreviewBuildConfig(config)).toThrow(/Preview build blocked/);
  });
});
