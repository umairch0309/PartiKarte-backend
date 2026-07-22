import stripe from "../config/stripe.js";

/**
 * Find an existing Stripe Customer by email or create one on the platform account.
 * With destination charges, customers live on the platform dashboard.
 */
export async function findOrCreateStripeCustomer({
  email,
  name,
  address,
  metadata = {},
}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Customer email is required for Stripe billing");
  }

  const existing = await stripe.customers.list({
    email: normalizedEmail,
    limit: 1,
  });

  if (existing.data.length > 0) {
    const customer = existing.data[0];
    const updates = {};

    if (name && customer.name !== name) {
      updates.name = name;
    }

    const nextAddress = buildStripeAddress(address);
    if (nextAddress && JSON.stringify(customer.address) !== JSON.stringify(nextAddress)) {
      updates.address = nextAddress;
    }

    if (Object.keys(updates).length > 0) {
      return stripe.customers.update(customer.id, updates);
    }

    return customer;
  }

  return stripe.customers.create({
    email: normalizedEmail,
    ...(name && { name }),
    ...(buildStripeAddress(address) && { address: buildStripeAddress(address) }),
    metadata,
  });
}

function buildStripeAddress(address = {}) {
  const line1 = address.addressDescription || address.line1;
  if (!line1 && !address.city && !address.country && !address.postalCode) {
    return undefined;
  }

  return {
    ...(line1 && { line1 }),
    ...(address.city && { city: address.city }),
    ...(address.postalCode && { postal_code: address.postalCode }),
    ...(address.country && { country: address.country }),
  };
}

/**
 * Persist Stripe customer + invoice IDs from a completed Checkout Session.
 */
export async function syncStripeBillingFromSession(session, order) {
  const updates = {};

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (customerId && order.stripeCustomerId !== customerId) {
    updates.stripeCustomerId = customerId;
  }

  const invoiceId =
    typeof session.invoice === "string" ? session.invoice : session.invoice?.id;

  if (invoiceId && order.stripeInvoiceId !== invoiceId) {
    updates.stripeInvoiceId = invoiceId;
  }

  return updates;
}
