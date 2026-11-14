import { describe, expect, it } from "vitest";
import { verifiedStripeCheckoutUrl } from "./verifiedStripeCheckoutUrl.js";

describe("Stripe Checkout redirect destination", () => {
  it("accepts standard Stripe hosted Checkout URLs", () => {
    expect(verifiedStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_example#frag")).toBeNull();
    expect(verifiedStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_example"))
      .toBe("https://checkout.stripe.com/c/pay/cs_test_example");
  });
  it.each([
    null, undefined, {}, "", "javascript:alert(1)", "//checkout.stripe.com/c/pay/x",
    "http://checkout.stripe.com/c/pay/x", "https://checkout.stripe.com.evil.test/c/pay/x",
    "https://evil.test/checkout.stripe.com/c/pay/x", "https://checkout.stripe.com@evil.test/c/pay/x",
    "https://user:pass@checkout.stripe.com/c/pay/x", "https://checkout.stripe.com:444/c/pay/x",
    "https://checkout.stripe.com/other",
    " https://checkout.stripe.com/c/pay/x", "https://checkout.stripe.com/c/pay/x ",
    "\thttps://checkout.stripe.com/c/pay/x", "https://checkout.stripe.com/c/\npay/x",
    "https://checkout.stripe.com/c/pay/x\r", "https://checkout.stripe.com/c/pay/x\u007f", "https://checkout.stripe.com/c/pay/x#fragment",
  ])("rejects unsafe or non-Checkout destinations: %s", (value) => {
    expect(verifiedStripeCheckoutUrl(value)).toBeNull();
  });
});
