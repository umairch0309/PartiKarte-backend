import mongoose from "mongoose";
import stripe, { PLATFORM_FEE_PERCENT } from "../config/stripe.js";
import { findBusinessAndUser } from "../DAL/common.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import {
  applyCouponDiscount,
  calculateFeeSplit,
  fromCents,
  toCents,
} from "../helpers/stripeFees.js";
import Business from "../models/business.js";
import Coupon from "../models/coupon.js";
import Event from "../models/event.js";
import Order from "../models/order.js";
import {
  fulfillPaidOrder,
  reverseOrderInventory,
} from "../services/fulfillPaidOrder.js";
import {
  findOrCreateStripeCustomer,
  syncStripeBillingFromSession,
} from "../services/stripeBilling.js";
import { notifyOrderRefund } from "../services/notifications.js";

const FRONTEND_URL = (
  process.env.FRONTEND_URL || "http://localhost:5173"
).replace(/\/$/, "");

function syncStripeFields(account) {
  return {
    accountId: account.id,
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    onboardingComplete: Boolean(
      account.details_submitted && account.charges_enabled
    ),
  };
}

export const createConnectAccount = async (req, res, next) => {
  try {
    const { user, business } = await findBusinessAndUser({ _id: req.userId });
    if (!user || !business) {
      return next(new HttpError("Invalid business", 400));
    }

    if (business.stripe?.accountId) {
      return res.status(200).json({
        message: "Stripe account already exists",
        data: { accountId: business.stripe.accountId, stripe: business.stripe },
      });
    }

    const account = await stripe.accounts.create({
      type: "express",
      country: "SI",
      email: user.email || business.contactInformation?.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: business.company?.companyName,
      },
      metadata: {
        businessId: business._id.toString(),
      },
    });

    business.stripe = syncStripeFields(account);
    await business.save();

    return res.status(201).json({
      message: "Stripe Connect account created",
      data: { accountId: account.id, stripe: business.stripe },
    });
  } catch (error) {
    console.error("createConnectAccount", error);
    return next(ServerError(error));
  }
};

export const createAccountLink = async (req, res, next) => {
  try {
    const { user, business } = await findBusinessAndUser({ _id: req.userId });
    if (!user || !business) {
      return next(new HttpError("Invalid business", 400));
    }

    let accountId = business.stripe?.accountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "SI",
        email: user.email || business.contactInformation?.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: business.company?.companyName,
        },
        metadata: {
          businessId: business._id.toString(),
        },
      });
      business.stripe = syncStripeFields(account);
      await business.save();
      accountId = account.id;
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${FRONTEND_URL}/business/settings/finance?stripe=refresh`,
      return_url: `${FRONTEND_URL}/business/settings/finance?stripe=return`,
      type: "account_onboarding",
    });

    return res.status(200).json({
      message: "Stripe onboarding link created",
      data: { url: accountLink.url },
    });
  } catch (error) {
    console.error("createAccountLink", error);
    return next(ServerError(error));
  }
};

export const getConnectStatus = async (req, res, next) => {
  try {
    const { user, business } = await findBusinessAndUser({ _id: req.userId });
    if (!user || !business) {
      return next(new HttpError("Invalid business", 400));
    }

    if (!business.stripe?.accountId) {
      return res.status(200).json({
        message: "Stripe not connected",
        data: {
          connected: false,
          stripe: business.stripe || {},
        },
      });
    }

    const account = await stripe.accounts.retrieve(business.stripe.accountId);
    business.stripe = {
      ...business.stripe?.toObject?.() ?? business.stripe,
      ...syncStripeFields(account),
    };
    await business.save();

    return res.status(200).json({
      message: "Stripe Connect status",
      data: {
        connected: true,
        stripe: business.stripe,
      },
    });
  } catch (error) {
    console.error("getConnectStatus", error);
    return next(ServerError(error));
  }
};

/**
 * Create unpaid Order + Stripe Checkout Session (destination charge + 8% fee).
 * Gross amount is orderAmount only (VAT already included by client after fix).
 */
export const createStripeCheckoutSession = async (req, res, next) => {
  try {
    const {
      eventId,
      recommendations,
      tickets,
      noOfTickets,
      orderAmount,
      customerEmail,
      customerName,
      city,
      country,
      postalCode,
      addressDescription,
      discountCode,
      couponCode,
    } = req.body;

    const eventRef = await Event.findById(eventId);
    if (!eventRef) {
      return next(new HttpError("Event not found", 404));
    }

    const business = await Business.findById(eventRef.businessId);
    if (!business?.stripe?.accountId || !business.stripe.chargesEnabled) {
      return next(
        new HttpError(
          "This organizer has not completed Stripe onboarding. Ticket sales are unavailable.",
          400
        )
      );
    }

    const actualTickets = (
      typeof tickets === "string" ? JSON.parse(tickets) : tickets
    )?.filter((ticket) => ticket.noOfTickets > 0);

    if (!actualTickets?.length) {
      return next(new HttpError("No tickets selected", 400));
    }

    // Server-side gross: sum (price * qty) + VAT, then apply coupon % on ticket subtotal
    let subtotal = 0;
    let vatTotal = 0;
    for (const t of actualTickets) {
      const found = eventRef.tickets.find(
        (ft) => ft._id.toString() === t.ticketId?.toString()
      );
      if (!found) {
        return next(new HttpError("Invalid ticket", 400));
      }
      if ((found.remainingCapacity || 0) < t.noOfTickets) {
        return next(new HttpError("Not enough ticket capacity", 400));
      }
      subtotal += (found.price || 0) * t.noOfTickets;
      vatTotal += (found.vat || 0) * t.noOfTickets;
    }

    let couponDoc = null;
    const code = discountCode || couponCode;
    if (code) {
      couponDoc = await Coupon.findOne({
        eventId: eventRef._id,
        code: String(code).trim(),
        isExpired: false,
      });
    }

    const { discountedSubtotal } = applyCouponDiscount(
      subtotal,
      couponDoc?.discount
    );
    // VAT proportionally reduced with coupon for consistent totals
    const vatRatio = subtotal > 0 ? discountedSubtotal / subtotal : 1;
    const adjustedVat = Math.round(vatTotal * vatRatio * 100) / 100;
    const computedGross =
      Math.round((discountedSubtotal + adjustedVat) * 100) / 100;

    // Prefer computed gross; fall back to client amount if computation is zero
    const gross = computedGross > 0 ? computedGross : parseFloat(orderAmount);
    if (!gross || gross <= 0) {
      return next(new HttpError("Invalid order amount", 400));
    }

    const feeSplit = calculateFeeSplit(gross, PLATFORM_FEE_PERCENT);
    const currency = (eventRef.eventCurrency || "EUR").toLowerCase();

    const transformedTickets = actualTickets.map((ticket) => ({
      ticketId: ticket.ticketId,
      noOfTickets: ticket.noOfTickets,
      allQuestions: ticket.allQuestions,
    }));

    const newOrder = new Order({
      eventId: new mongoose.Types.ObjectId(eventId),
      recommendations:
        recommendations === true || recommendations === "true",
      tickets: transformedTickets,
      noOfTickets: parseInt(noOfTickets, 10),
      orderAmount: feeSplit.orderAmount,
      platformFeeAmount: feeSplit.platformFeeAmount,
      netToBusiness: feeSplit.netToBusiness,
      currency: currency.toUpperCase(),
      customerEmail,
      customerName,
      paymentStatus: false,
      customerAddress: {
        city,
        country,
        postalCode,
        addressDescription,
      },
      businessId: eventRef.businessId,
      ...(couponDoc && {
        couponId: couponDoc._id,
        couponCode: couponDoc.code,
      }),
    });

    actualTickets.forEach((t) => {
      eventRef.tickets = eventRef.tickets?.map((foundTicket) => {
        if (foundTicket._id.toString() === t.ticketId) {
          return {
            ...foundTicket.toObject?.() ?? foundTicket,
            ticketOrders: (foundTicket.ticketOrders || 0) + t.noOfTickets,
            revenue:
              (foundTicket.revenue || 0) +
              (foundTicket.price || 0) * t.noOfTickets,
            remainingCapacity:
              (foundTicket.remainingCapacity || 0) - t.noOfTickets,
          };
        }
        return foundTicket;
      });
    });

    eventRef.ticketsSold += parseInt(noOfTickets, 10);
    eventRef.revenue += feeSplit.orderAmount;

    await eventRef.save();
    await newOrder.save();

    const stripeCustomer = await findOrCreateStripeCustomer({
      email: customerEmail,
      name: customerName,
      address: {
        city,
        country,
        postalCode,
        addressDescription,
      },
      metadata: {
        source: "partikarte_checkout",
      },
    });

    newOrder.stripeCustomerId = stripeCustomer.id;
    await newOrder.save();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: stripeCustomer.id,
      customer_update: {
        name: "auto",
        address: "auto",
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: {
            orderId: newOrder._id.toString(),
            eventId: eventRef._id.toString(),
            businessId: business._id.toString(),
            eventName: eventRef.eventName || "",
          },
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: feeSplit.grossCents,
            product_data: {
              name: eventRef.eventName || "Event tickets",
              description: `${noOfTickets} ticket(s)`,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: feeSplit.platformFeeCents,
        transfer_data: {
          destination: business.stripe.accountId,
        },
        metadata: {
          orderId: newOrder._id.toString(),
          eventId: eventRef._id.toString(),
          businessId: business._id.toString(),
        },
      },
      success_url: `${FRONTEND_URL}/business/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/checkout/payment-error`,
      metadata: {
        orderId: newOrder._id.toString(),
        eventId: eventRef._id.toString(),
        businessId: business._id.toString(),
      },
    });

    newOrder.stripeCheckoutSessionId = session.id;
    await newOrder.save();

    return res.status(201).json({
      message: "Stripe Checkout session created",
      data: {
        sessionId: session.id,
        url: session.url,
        orderId: newOrder._id,
        orderAmount: feeSplit.orderAmount,
        platformFeeAmount: feeSplit.platformFeeAmount,
        netToBusiness: feeSplit.netToBusiness,
      },
    });
  } catch (error) {
    console.error("createStripeCheckoutSession", error);
    return res.status(500).json({
      message: error?.message || "Failed to create Stripe Checkout session",
    });
  }
};

export const refundOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const {
      amount,
      refundApplicationFee = true,
    } = req.body || {};

    const { user, business } = await findBusinessAndUser({ _id: req.userId });
    if (!user || !business) {
      return next(new HttpError("Invalid business", 400));
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return next(new HttpError("Order not found", 404));
    }
    if (order.businessId.toString() !== business._id.toString()) {
      return next(new HttpError("Not authorized for this order", 403));
    }
    if (!order.paymentStatus) {
      return next(new HttpError("Order is not paid", 400));
    }
    if (order.refundStatus === "full") {
      return next(new HttpError("Order already fully refunded", 400));
    }
    if (!order.stripePaymentIntentId) {
      return next(new HttpError("No Stripe payment found for this order", 400));
    }

    const alreadyRefundedCents = toCents(order.refundedAmount || 0);
    const grossCents = toCents(order.orderAmount);
    const remainingCents = grossCents - alreadyRefundedCents;

    if (remainingCents <= 0) {
      return next(new HttpError("Nothing left to refund", 400));
    }

    let refundCents = remainingCents;
    if (amount != null && amount !== "") {
      refundCents = toCents(amount);
      if (refundCents <= 0 || refundCents > remainingCents) {
        return next(new HttpError("Invalid refund amount", 400));
      }
    }

    // Deliberate choice: default true so platform fee is clawed back on refund.
    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: refundCents,
      refund_application_fee: Boolean(refundApplicationFee),
      reverse_transfer: true,
    });

    const refundedMajor = fromCents(refundCents);
    const refundRatio = order.orderAmount > 0 ? refundedMajor / order.orderAmount : 0;
    const netClawback =
      Math.round((order.netToBusiness || 0) * refundRatio * 100) / 100;

    const businessDoc = await Business.findById(business._id);
    await Business.findByIdAndUpdate(business._id, {
      earnings: {
        currentBalance: Math.max(
          0,
          (businessDoc?.earnings?.currentBalance || 0) - netClawback
        ),
        totalEarnings: Math.max(
          0,
          (businessDoc?.earnings?.totalEarnings || 0) - netClawback
        ),
      },
    });

    order.refundedAmount = (order.refundedAmount || 0) + refundedMajor;
    order.refundStatus =
      order.refundedAmount >= order.orderAmount - 0.001 ? "full" : "partial";
    order.refundedApplicationFee = Boolean(refundApplicationFee);
    await order.save();

    await notifyOrderRefund({
      order,
      refundedAmount: refundedMajor,
    });

    return res.status(200).json({
      message: "Refund processed",
      data: {
        refundId: refund.id,
        refundedAmount: order.refundedAmount,
        refundStatus: order.refundStatus,
        refundedApplicationFee: order.refundedApplicationFee,
      },
    });
  } catch (error) {
    console.error("refundOrder", error);
    return res.status(500).json({
      message: error?.message || "Refund failed",
    });
  }
};

async function handleAccountUpdated(account) {
  const business = await Business.findOne({
    "stripe.accountId": account.id,
  });
  if (!business) {
    // Fallback: metadata.businessId from account create
    const businessId = account.metadata?.businessId;
    if (!businessId) return;
    const byId = await Business.findById(businessId);
    if (!byId) return;
    byId.stripe = {
      ...byId.stripe?.toObject?.() ?? byId.stripe,
      ...syncStripeFields(account),
    };
    await byId.save();
    return;
  }

  business.stripe = {
    ...business.stripe?.toObject?.() ?? business.stripe,
    ...syncStripeFields(account),
  };
  await business.save();
}

async function handleCheckoutCompleted(session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  let fullSession = session;
  if (!session.invoice || !session.customer) {
    fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["customer", "invoice"],
    });
  }

  const paymentIntentId =
    typeof fullSession.payment_intent === "string"
      ? fullSession.payment_intent
      : fullSession.payment_intent?.id;

  const order = await Order.findById(orderId);
  if (order) {
    const billingUpdates = await syncStripeBillingFromSession(fullSession, order);
    if (Object.keys(billingUpdates).length > 0) {
      Object.assign(order, billingUpdates);
      await order.save();
    }
  }

  await fulfillPaidOrder(orderId, {
    stripeCheckoutSessionId: fullSession.id,
    stripePaymentIntentId: paymentIntentId,
  });
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) {
    // Resolve via checkout session id stored on order if metadata missing
    return;
  }
  await fulfillPaidOrder(orderId, {
    stripePaymentIntentId: paymentIntent.id,
  });
}

async function handleCheckoutExpired(session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const order = await Order.findById(orderId);
  if (!order || order.paymentStatus) return;

  await reverseOrderInventory(order);
  // Keep order record for audit; leave paymentStatus false
}

async function handleChargeRefunded(charge) {
  // Ledger adjustments for Dashboard-initiated refunds
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!order || !order.paymentStatus) return;

  const refundedCents = charge.amount_refunded || 0;
  const refundedMajor = fromCents(refundedCents);
  const previousRefunded = order.refundedAmount || 0;

  if (refundedMajor <= previousRefunded + 0.001) {
    return; // already processed (e.g. via our refund API)
  }

  const delta = Math.round((refundedMajor - previousRefunded) * 100) / 100;
  const refundRatio = order.orderAmount > 0 ? delta / order.orderAmount : 0;
  const netClawback =
    Math.round((order.netToBusiness || 0) * refundRatio * 100) / 100;

  const businessDoc = await Business.findById(order.businessId);
  await Business.findByIdAndUpdate(order.businessId, {
    earnings: {
      currentBalance: Math.max(
        0,
        (businessDoc?.earnings?.currentBalance || 0) - netClawback
      ),
      totalEarnings: Math.max(
        0,
        (businessDoc?.earnings?.totalEarnings || 0) - netClawback
      ),
    },
  });

  order.refundedAmount = refundedMajor;
  order.refundStatus =
    refundedMajor >= order.orderAmount - 0.001 ? "full" : "partial";
  // Stripe Dashboard refunds: application fee refund depends on refund settings
  if (charge.refunds?.data?.[0]) {
    order.refundedApplicationFee = Boolean(
      charge.refunds.data[0].refund_application_fee ??
        order.refundedApplicationFee
    );
  }
  await order.save();
}

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "account.updated":
        await handleAccountUpdated(event.data.object);
        break;
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;
      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return res.status(500).json({ message: "Webhook handler failed" });
  }
};
