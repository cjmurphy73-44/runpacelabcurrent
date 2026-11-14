import { describe, expect, it, vi } from "vitest";
import { launchBillingPortal } from "./launchBillingPortal.js";

const valid = "https://billing.stripe.com/p/session/test_session_123";
function fixture({ framed = true, response = { data: { url: valid } }, rejected = false, blocked = false } = {}) {
  const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
  const openTab = vi.fn(() => blocked ? null : tab);
  const invoke = vi.fn(() => rejected ? Promise.reject(new Error("backend unavailable")) : Promise.resolve(response));
  const navigate = vi.fn();
  const notify = vi.fn();
  return { tab, openTab, invoke, navigate, notify, framed };
}

describe("billing portal popup boundary", () => {
  it("reserves a framed tab before awaiting the backend, then navigates", async () => {
    const f = fixture();
    let resolve;
    f.invoke = vi.fn(() => new Promise(r => { resolve = r; }));
    const pending = launchBillingPortal(f);
    expect(f.openTab).toHaveBeenCalledWith("", "_blank");
    expect(f.tab.opener).toBeNull();
    expect(f.tab.location.replace).not.toHaveBeenCalled();
    resolve({ data: { url: valid } });
    expect(await pending).toBe(true);
    expect(f.tab.location.replace).toHaveBeenCalledWith(valid);
    expect(f.navigate).not.toHaveBeenCalled();
  });
  it("does not invoke backend when popup is blocked", async () => {
    const f = fixture({ blocked: true });
    expect(await launchBillingPortal(f)).toBe(false);
    expect(f.invoke).not.toHaveBeenCalled();
    expect(f.notify).toHaveBeenCalled();
  });
  it("closes reserved tab on invalid destination", async () => {
    const f = fixture({ response: { data: { url: "https://evil.example/p/session/x" } } });
    expect(await launchBillingPortal(f)).toBe(false);
    expect(f.tab.close).toHaveBeenCalledOnce();
    expect(f.tab.location.replace).not.toHaveBeenCalled();
  });
  it("closes reserved tab on backend rejection", async () => {
    const f = fixture({ rejected: true });
    expect(await launchBillingPortal(f)).toBe(false);
    expect(f.tab.close).toHaveBeenCalledOnce();
    expect(f.notify).toHaveBeenCalled();
  });
  it("closes the reserved tab when navigation throws", async () => {
    const f = fixture();
    f.tab.location.replace.mockImplementation(() => { throw new Error("navigation blocked"); });
    expect(await launchBillingPortal(f)).toBe(false);
    expect(f.tab.close).toHaveBeenCalledOnce();
    expect(f.notify).toHaveBeenCalled();
  });
  it("rejects a missing backend URL without navigating", async () => {
    const f = fixture({ response: { data: {} } });
    expect(await launchBillingPortal(f)).toBe(false);
    expect(f.tab.close).toHaveBeenCalledOnce();
    expect(f.navigate).not.toHaveBeenCalled();
    expect(f.tab.location.replace).not.toHaveBeenCalled();
  });
  it("reports a top-level navigation exception without opening a popup", async () => {
    const f = fixture({ framed: false });
    f.navigate.mockImplementation(() => { throw new Error("navigation blocked"); });
    expect(await launchBillingPortal(f)).toBe(false);
    expect(f.openTab).not.toHaveBeenCalled();
    expect(f.notify).toHaveBeenCalled();
  });
  it("navigates the current window when unframed", async () => {
    const f = fixture({ framed: false });
    expect(await launchBillingPortal(f)).toBe(true);
    expect(f.openTab).not.toHaveBeenCalled();
    expect(f.navigate).toHaveBeenCalledWith(valid);
  });
});
