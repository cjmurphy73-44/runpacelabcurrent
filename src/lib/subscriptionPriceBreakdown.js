/**
 * Synthetic Australian subscription price breakdown.
 * No Stripe, tax authority or account access. Amounts are integer AUD cents.
 * GST registration and taxable-supply status must be determined separately.
 */
const assertCents = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${label} must be nonnegative safe integer cents`);
};
const assertRate = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10000) throw new RangeError(`${label} must be integer basis points from 0 to 10000`);
};
const roundDivide = (numerator, denominator) => {
  const result = (BigInt(numerator) + BigInt(denominator) / 2n) / BigInt(denominator);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('result exceeds safe cents range');
  return Number(result);
};

/**
 * @param {{priceCents:number, gstBasisPoints:number, priceIncludesGst:boolean,
 *   gstApplies:boolean, feeBasisPoints?:number, feeFixedCents?:number}} input
 */
export function calculateSubscriptionPriceBreakdown(input) {
  if (!input || typeof input !== 'object') throw new TypeError('input required');
  const { priceCents, gstBasisPoints, priceIncludesGst, gstApplies,
    feeBasisPoints = 0, feeFixedCents = 0 } = input;
  assertCents(priceCents, 'priceCents');
  assertRate(gstBasisPoints, 'gstBasisPoints');
  assertRate(feeBasisPoints, 'feeBasisPoints');
  assertCents(feeFixedCents, 'feeFixedCents');
  if (typeof priceIncludesGst !== 'boolean' || typeof gstApplies !== 'boolean') {
    throw new TypeError('priceIncludesGst and gstApplies must be explicit booleans');
  }
  const gstCents = !gstApplies ? 0 : priceIncludesGst
    ? roundDivide(BigInt(priceCents) * BigInt(gstBasisPoints), BigInt(10000 + gstBasisPoints))
    : roundDivide(BigInt(priceCents) * BigInt(gstBasisPoints), 10000n);
  const chargedCents = priceIncludesGst || !gstApplies ? priceCents : priceCents + gstCents;
  assertCents(chargedCents, 'chargedCents');
  const netRevenueCents = chargedCents - gstCents;
  const percentageFeeCents = roundDivide(BigInt(chargedCents) * BigInt(feeBasisPoints), 10000n);
  const processingFeeCents = percentageFeeCents + feeFixedCents;
  assertCents(processingFeeCents, 'processingFeeCents');
  return Object.freeze({
    chargedCents, gstCents, netRevenueCents, processingFeeCents,
    afterProcessingCents: netRevenueCents - processingFeeCents,
  });
}
