import { describe, expect, it } from "vitest";
import { billingReturnNotice, freePlanAction } from "../billingReturnNotice";

describe("checkout return UI never grants unverified entitlement", () => {
  it("uses neutral status language after redirect from checkout", () => {
    const notice = billingReturnNotice("success");
    expect(notice.title).not.toMatch(/active|unlocked/i);
    expect(notice.description).toMatch(/only when payment and entitlement are confirmed/);
    expect(notice.refreshEntitlement).toBe(true);
  });
  it("does not equate cancellation return with payment failure or membership revocation", () => {
    const notice = billingReturnNotice("canceled");
    expect(notice.refreshEntitlement).toBe(false);
    expect(notice.description).toMatch(/No subscription change has been confirmed/);
  });
  it("ignores forged/unknown query parameters", () => {
    expect(billingReturnNotice("active")).toBeNull();
    expect(billingReturnNotice("paid")).toBeNull();
    expect(billingReturnNotice("success<script>")).toBeNull();
    expect(billingReturnNotice(null)).toBeNull();
  });
  it("offers a real management route to paid subscribers, not an inert downgrade", () => {
    for (const plan of ["pro", "unlimited", "coach_pro", "team"]) {
      expect(freePlanAction(plan)).toEqual({
        label: "Manage or cancel subscription", manageBilling: true,
      });
    }
    expect(freePlanAction("free")).toEqual({
      label: "Your current plan", manageBilling: false,
    });
    expect(freePlanAction(undefined).manageBilling).toBe(false);
  });
});
