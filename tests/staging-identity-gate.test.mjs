import { describe, expect, it } from "vitest";
import { PRODUCTION_APP_ID, validateStagingIdentity } from "../scripts/staging-identity-gate.mjs";

const staging = {
  stagingAppId: "aaaaaaaaaaaaaaaaaaaaaaaa",
  productionAppId: PRODUCTION_APP_ID,
  stagingBaseUrl: "https://staging-example.base44.app",
  productionBaseUrl: "https://production-example.base44.app",
};

describe("fail-closed staging identity acceptance", () => {
  it("accepts only explicitly distinct synthetic app IDs and HTTPS origins", () => {
    expect(validateStagingIdentity(staging)).toEqual({ ok: true, reason: "explicit-distinct-identity" });
  });
  it.each([
    [{ ...staging, stagingAppId: "" }, "missing-or-invalid-app-id"],
    [{ ...staging, stagingAppId: "not-an-app-id" }, "missing-or-invalid-app-id"],
    [{ ...staging, stagingAppId: PRODUCTION_APP_ID }, "production-app-id"],
    [{ ...staging, stagingBaseUrl: "" }, "missing-base-url"],
    [{ ...staging, stagingBaseUrl: "not-a-url" }, "invalid-base-url"],
    [{ ...staging, stagingBaseUrl: "http://staging-example.base44.app" }, "unsafe-base-url"],
    [{ ...staging, stagingBaseUrl: "https://user:password@staging-example.base44.app" }, "unsafe-base-url"],
    [{ ...staging, stagingBaseUrl: "https://staging-example.base44.app/?token=redacted" }, "unsafe-base-url"],
    [{ ...staging, stagingBaseUrl: staging.productionBaseUrl }, "production-base-url"],
    [{ ...staging, stagingBaseUrl: "https://PRODUCTION-EXAMPLE.base44.app/" }, "production-base-url"],
    [{ ...staging, productionBaseUrl: undefined }, "missing-base-url"],
  ])("rejects unsafe or ambiguous preview configuration: %s", (config, reason) => {
    expect(validateStagingIdentity(config)).toEqual({ ok: false, reason });
  });
});
