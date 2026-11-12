import { describe, expect, it } from "vitest";
import { classifyProviderConnection } from "../providerConnectionState";

describe("provider connection status", () => {
  it("shows explicit expired or failed authorization as reconnect required", () => {
    expect(classifyProviderConnection({ connected: false, needs_reconnect: true })).toBe("expired");
    expect(classifyProviderConnection({ connected: false, status: "error" })).toBe("expired");
  });
  it("does not mistake unknown or partial status for healthy sync", () => {
    expect(classifyProviderConnection({ needs_reconnect: false })).toBe("unknown");
    expect(classifyProviderConnection({ connected: true })).toBe("unknown");
    expect(classifyProviderConnection({})).toBe("unknown");
    expect(classifyProviderConnection(null)).toBe("unknown");
  });
  it("does not warn about providers that are explicitly disconnected", () => {
    expect(classifyProviderConnection({ connected: false, status: "disconnected" })).toBe("disconnected");
    expect(classifyProviderConnection({ connected: false, needs_reconnect: false })).toBe("disconnected");
  });
  it("accepts only explicit connected and reconnect healthy signals", () => {
    expect(classifyProviderConnection({ connected: true, needs_reconnect: false })).toBe("ok");
  });
});
