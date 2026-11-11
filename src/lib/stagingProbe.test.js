import { describe, expect, it, vi } from "vitest";
import { probeStagingApi } from "./stagingProbe";

const appId = "6aefe9d09e2788fc8591c758";
const appBaseUrl = "https://train-pace-lab-copy-8591c758.base44.app";

describe("staging browser API probe", () => {
  it.each([401, 403])("recognizes authentication-required response %s as reachable", async (code) => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: code });
    const result = await probeStagingApi({ appId, appBaseUrl, fetchImpl });
    expect(result.status).toBe("pass");
    expect(result.httpStatus).toBe(code);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${appBaseUrl}/api/apps/${appId}/entities/User/me`);
    expect(options).toMatchObject({
      method: "GET", credentials: "omit", mode: "cors", redirect: "error",
      headers: { Accept: "application/json", "X-App-Id": appId },
    });
    expect(options.headers).not.toHaveProperty("Authorization");
  });

  it("flags a public response for review", async () => {
    const result = await probeStagingApi({
      appId, appBaseUrl, fetchImpl: vi.fn().mockResolvedValue({ status: 200 }),
    });
    expect(result.status).toBe("warning");
  });

  it.each([404, 500])("blocks unexpected HTTP %s", async (code) => {
    const result = await probeStagingApi({
      appId, appBaseUrl, fetchImpl: vi.fn().mockResolvedValue({ status: code }),
    });
    expect(result.status).toBe("blocked");
  });

  it("does not expose network error details", async () => {
    const result = await probeStagingApi({
      appId, appBaseUrl, fetchImpl: vi.fn().mockRejectedValue(new Error("secret")),
    });
    expect(result.status).toBe("blocked");
    expect(result.message).not.toContain("secret");
  });

  it("does not call fetch for invalid app IDs or non-HTTPS origins", async () => {
    const fetchImpl = vi.fn();
    expect((await probeStagingApi({ appId: "bad", appBaseUrl, fetchImpl })).status).toBe("blocked");
    expect((await probeStagingApi({ appId, appBaseUrl: "http://example.com", fetchImpl })).status).toBe("blocked");
    expect((await probeStagingApi({ appId, appBaseUrl: "https://example.com/other", fetchImpl })).status).toBe("blocked");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
