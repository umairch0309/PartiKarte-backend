import { PLATFORM_FEE_PERCENT } from "../config/stripe.js";

/** Convert major currency units (e.g. EUR) to cents for Stripe. */
export function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

/** Convert Stripe cents to major currency units. */
export function fromCents(cents) {
  return Number(cents) / 100;
}

/**
 * Split a gross order amount into platform fee (default 8%) and business net.
 * Amounts are in major units (EUR).
 */
export function calculateFeeSplit(grossAmount, feePercent = PLATFORM_FEE_PERCENT) {
  const gross = Number(grossAmount) || 0;
  const percent = Number(feePercent) || 0;
  const platformFeeAmount =
    Math.round(((gross * percent) / 100) * 100) / 100;
  const netToBusiness = Math.round((gross - platformFeeAmount) * 100) / 100;

  return {
    orderAmount: gross,
    platformFeeAmount,
    netToBusiness,
    platformFeeCents: toCents(platformFeeAmount),
    grossCents: toCents(gross),
  };
}

/**
 * Apply a percent coupon to a subtotal (ticket prices before VAT).
 * discount is a percentage (e.g. 10 = 10%).
 */
export function applyCouponDiscount(subtotal, discountPercent) {
  const base = Number(subtotal) || 0;
  const discount = Number(discountPercent) || 0;
  if (!discount) {
    return { discountedSubtotal: base, discountAmount: 0 };
  }
  const discountAmount = Math.round(base * (discount / 100) * 100) / 100;
  const discountedSubtotal = Math.round((base - discountAmount) * 100) / 100;
  return { discountedSubtotal, discountAmount };
}
