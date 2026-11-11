import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppParams } from "./app-params";

const PUBLISHED_APP_ID = "6a504ebe6a5a6d1be058226c";
const STAGING_APP_ID = "7b615cdf7b6b7e2cf169337d";
const STAGING_URL = "https://trainpacelab-staging.base44.app";

afterEach(() => {
  vi.unstubAllGlobals();
});

function preview(environment = {}, deploymentEnvironment = "preview") {
  return getAppParams({ environment, deploymentEnvironment, hostname: "tpl-git-test-team.vercel.app" });
}

describe("Base44 Vercel preview isolation", () => {
  it("fails closed if preview variables are missing", () => {
    const params = preview();
    expect(params.appId).toBeNull();
    expect(params.appBaseUrl).toBe("");
    expect(params.token).toBeNull();
    expect(params.configurationError).toMatch(/Preview requires a verified staging/);
  });

  it("rejects the published app ID even with an HTTPS base URL", () => {
    const params = preview({ VITE_APP_ID: PUBLISHED_APP_ID, VITE_APP_BASE_URL: STAGING_URL });
    expect(params.appId).toBeNull();
    expect(params.configurationError).toBeTruthy();
  });

  it.each([
    "http://trainpacelab-staging.base44.app",
    "https://username:password@trainpacelab-staging.base44.app",
    "https://trainpacelab-staging.base44.app/?app_id=other",
    "not-a-url",
  ])("rejects invalid preview base URL: %s", (url) => {
    const params = preview({ VITE_APP_ID: STAGING_APP_ID, VITE_APP_BASE_URL: url });
    expect(params.appId).toBeNull();
    expect(params.configurationError).toBeTruthy();
  });

  it("uses only build-time staging identifiers, ignoring URL and browser storage", () => {
    const replaceState = vi.fn();
    const storage = new Map([
      ["app_id", PUBLISHED_APP_ID],
      ["app_base_url", "https://published.base44.app"],
      ["access_token", "stale-production-token"],
    ]);
    vi.stubGlobal("window", {
      location: {
        hostname: "tpl-git-test-team.vercel.app",
        pathname: "/app",
        search: "?app_id=" + PUBLISHED_APP_ID + "&app_base_url=https%3A%2F%2Fpublished.base44.app&access_token=staging-token",
        hash: "",
        href: "https://tpl-git-test-team.vercel.app/app",
      },
      localStorage: {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value),
      },
      history: { replaceState },
    });

    const params = preview({ VITE_APP_ID: STAGING_APP_ID, VITE_APP_BASE_URL: STAGING_URL });
    expect(params.appId).toBe(STAGING_APP_ID);
    expect(params.appBaseUrl).toBe(STAGING_URL);
    expect(params.token).toBe("staging-token");
    expect(params.configurationError).toBeNull();
    expect(replaceState).toHaveBeenCalled();
    expect(storage.get("app_id")).toBe(PUBLISHED_APP_ID);
  });

  it("recognizes Vercel branch preview hostnames even if the build label is missing", () => {
    const params = preview({}, "");
    expect(params.configurationError).toBeTruthy();
  });

  it("preserves the published fallback outside preview environments", () => {
    const params = getAppParams({
      environment: {},
      deploymentEnvironment: "production",
      hostname: "trainpacelab.com",
    });
    expect(params.appId).toBe(PUBLISHED_APP_ID);
    expect(params.configurationError).toBeUndefined();
  });
});
