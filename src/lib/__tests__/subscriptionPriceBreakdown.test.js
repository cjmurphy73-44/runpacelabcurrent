import { describe, expect, it } from 'vitest';
import { calculateSubscriptionPriceBreakdown as calculate } from '../subscriptionPriceBreakdown.js';

const base = { priceCents: 990, gstBasisPoints: 1000, priceIncludesGst: true, gstApplies: true };
describe('synthetic Australian subscription price breakdown', () => {
  it('splits a GST-inclusive A$9.90 example exactly', () => {
    expect(calculate(base)).toEqual({
      chargedCents: 990, gstCents: 90, netRevenueCents: 900,
      processingFeeCents: 0, afterProcessingCents: 900,
    });
  });
  it('adds GST to exclusive price and charges fees on gross payment', () => {
    expect(calculate({ ...base, priceIncludesGst: false, feeBasisPoints: 200, feeFixedCents: 30 })).toEqual({
      chargedCents: 1089, gstCents: 99, netRevenueCents: 990,
      processingFeeCents: 52, afterProcessingCents: 938,
    });
  });
  it('does not invent GST when taxable status is false', () => {
    expect(calculate({ ...base, gstApplies: false }).gstCents).toBe(0);
  });
  it('rejects missing tax applicability and invalid amounts', () => {
    expect(() => calculate({ ...base, gstApplies: undefined })).toThrow(TypeError);
    expect(() => calculate({ ...base, priceCents: -1 })).toThrow(RangeError);
    expect(() => calculate({ ...base, priceCents: 1.2 })).toThrow(RangeError);
    expect(() => calculate({ ...base, feeBasisPoints: 10001 })).toThrow(RangeError);
  });
  it('uses integer cents for small inclusive prices', () => {
    expect(calculate({ ...base, priceCents: 1 }).gstCents).toBe(0);
  });
});
