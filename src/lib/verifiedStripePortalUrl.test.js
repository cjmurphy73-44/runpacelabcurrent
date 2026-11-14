import { describe, expect, it } from "vitest";
import { verifiedStripePortalUrl } from "./verifiedStripePortalUrl.js";

describe("Stripe billing portal redirect", () => {
  it("accepts a Stripe-hosted portal session", () => {
    const url = "https://billing.stripe.com/p/session/test_session_123";
    expect(verifiedStripePortalUrl(url)).toBe(url);
  });
  it.each([
    null, undefined, {}, "", "javascript:alert(1)",
    "http://billing.stripe.com/p/session/x",
    "https://billing.stripe.com.evil.test/p/session/x",
    "https://billing.stripe.com@evil.test/p/session/x",
    "https://user:pass@billing.stripe.com/p/session/x",
    "https://billing.stripe.com:444/p/session/x",
    "https://checkout.stripe.com/c/pay/x",
    "https://billing.stripe.com/other",
    "https://billing.stripe.com/p/session/",
    "https://billing.stripe.com/p/session/x#fragment",
    " https://billing.stripe.com/p/session/x",
    "https://billing.stripe.com/p/\nsession/x",
    "https://billing.stripe.com/p/session/x\u007f",
    "https://billing.stripe.com/p/session/old/../new",
    "https://billing.stripe.com/p/session/x/./y",
    "https://BILLING.stripe.com/p/session/x",
    "https://billing.stripe.com/p/session/x/extra",
    "https://billing.stripe.com/p/session/x/",
    "https://billing.stripe.com/p/session/x%2Fextra",
  ])("rejects untrusted portal destination: %s", value => {
    expect(verifiedStripePortalUrl(value)).toBeNull();
  });
});
