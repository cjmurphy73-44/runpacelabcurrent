import { describe, expect, it } from "vitest";
import { resolveSubscriptionEntitlement } from "../resolveSubscriptionEntitlement";

describe("subscription UI projection fails closed", () => {
  it("grants known paid plans only for active or trialing status", () => {
    for (const plan of ["pro", "unlimited", "coach_pro", "team"]) {
      for (const status of ["active", "trialing"]) {
        expect(resolveSubscriptionEntitlement([{ plan, status }])).toEqual({ plan, status });
      }
    }
  });
  it("does not grant expired, incomplete, canceled or unknown status", () => {
    for (const status of ["canceled", "past_due", "unpaid", "incomplete", "incomplete_expired", "unknown", null, undefined]) {
      const state = resolveSubscriptionEntitlement([{ plan: "pro", status }]);
      expect(state.plan).toBe("free");
    }
  });
  it("denies malformed and missing subscriptions", () => {
    for (const rows of [undefined, null, [], {}, [null], [{ plan: "pro" }], [{ plan: "admin", status: "active" }]]) {
      expect(resolveSubscriptionEntitlement(rows).plan).toBe("free");
    }
  });
  it("does not use a stale second row to grant paid access", () => {
    expect(resolveSubscriptionEntitlement([
      { plan: "pro", status: "canceled" },
      { plan: "pro", status: "active" },
    ])).toEqual({ plan: "free", status: "canceled" });
  });
});
