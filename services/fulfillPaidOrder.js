import Order from "../models/order.js";
import Event from "../models/event.js";
import Business from "../models/business.js";
import generateTickets from "../helpers/generateTickets.js";
import generateInvoice from "../helpers/generateInvoice.js";
import { SendTicketEmail } from "../helpers/sendEmail.js";
import { currencySymbolGenerator } from "../helpers/helpers.js";
import {
  buildTicketEmailAttachments,
  saveOrderDocuments,
} from "../helpers/orderDocuments.js";
import {
  notifyNewPaidOrder,
  notifyTicketPurchase,
} from "./notifications.js";

/**
 * Mark order paid, credit net earnings, generate tickets + invoice email.
 * Idempotent: safe under duplicate Stripe webhook delivery.
 */
export async function fulfillPaidOrder(orderId, stripeExtras = {}) {
  const stripeSet = {
    ...(stripeExtras.stripePaymentIntentId && {
      stripePaymentIntentId: stripeExtras.stripePaymentIntentId,
    }),
    ...(stripeExtras.stripeCheckoutSessionId && {
      stripeCheckoutSessionId: stripeExtras.stripeCheckoutSessionId,
    }),
  };

  // Atomically claim unpaid → paid to avoid double-crediting earnings
  let order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: false },
    {
      $set: {
        paymentStatus: true,
        ...stripeSet,
      },
    },
    { new: true }
  );

  let newlyPaid = Boolean(order);

  if (!order) {
    order = await Order.findById(orderId);
    if (!order) {
      console.error("fulfillPaidOrder: order not found", orderId);
      return { ok: false, reason: "order_not_found" };
    }
    if (Object.keys(stripeSet).length) {
      Object.assign(order, stripeSet);
      await order.save();
    }
  }

  if (order.paymentStatus && order.automatedMailSent) {
    return { ok: true, reason: "already_fulfilled", order };
  }

  const event = await Event.findById(order.eventId);
  if (!event) {
    console.error("fulfillPaidOrder: event not found", order.eventId);
    return { ok: false, reason: "event_not_found" };
  }

  if (newlyPaid) {
    const businessForCalc = await Business.findById(order.businessId);
    const net = Number(order.netToBusiness) || 0;

    await Business.findByIdAndUpdate(order.businessId, {
      earnings: {
        currentBalance: (businessForCalc?.earnings?.currentBalance || 0) + net,
        totalEarnings: (businessForCalc?.earnings?.totalEarnings || 0) + net,
      },
    });

    await notifyNewPaidOrder({ order, eventName: event.eventName });
    await notifyTicketPurchase({ order, eventName: event.eventName });
  }

  if (order.automatedMailSent) {
    return { ok: true, reason: "already_emailed", order };
  }

  // Claim email send
  const emailClaim = await Order.findOneAndUpdate(
    { _id: orderId, automatedMailSent: false },
    { $set: { automatedMailSent: true } },
    { new: true }
  );

  if (!emailClaim) {
    return { ok: true, reason: "email_in_progress_or_done", order };
  }

  const transformedTickets = [];
  for (const ticket of order.tickets) {
    const foundTicket = event.tickets.find(
      (t) => t._id?.toString() === ticket?.ticketId?.toString()
    );

    transformedTickets.push({
      ticketId: ticket.ticketId,
      noOfTickets: ticket.noOfTickets,
      qrCodeData: `orderId=${order._id}&&eventId=${event._id}&&ticketId=${ticket.ticketId}&&id=`,
      ticketAppearance: {
        ...foundTicket?.ticketAppearance,
        eventName: event.eventName,
        eventVenue: event.eventVenue,
        ticketPrice: foundTicket?.price,
        ticketVat: foundTicket?.vat,
        descriptionTicket: foundTicket?.descriptionTicket,
        currency: currencySymbolGenerator(
          order.currency || event.eventCurrency
        ),
      },
    });
  }

  try {
    const pdfResult = await generateTickets(transformedTickets);
    const business = await Business.findById(event.businessId);

    let vatAmount = 0;
    transformedTickets.forEach((ticket) => {
      if (ticket?.noOfTickets > 0) {
        for (let i = 0; i < ticket.noOfTickets; i++) {
          vatAmount += parseFloat(ticket?.ticketAppearance?.ticketVat || 0);
        }
      }
    });

    const invoiceResult = await generateInvoice({
      order,
      vatAmount: vatAmount || 0,
      business,
      tickets: transformedTickets,
      currency: currencySymbolGenerator(order.currency || event.eventCurrency),
      type: "Paid Order - Online",
    });

    const savedDocs = saveOrderDocuments({
      orderId: order._id.toString(),
      pdfResult,
      invoiceResult,
    });
    const attachments = buildTicketEmailAttachments(pdfResult, invoiceResult);

    const emailResult = await SendTicketEmail({
      customerName: order.customerName,
      eventName: event.eventName,
      email: order.customerEmail,
      documentLinks: savedDocs.files,
      attachments,
    });

    if (!emailResult?.ok) {
      throw new Error(
        `Ticket email failed: ${JSON.stringify(emailResult?.error || "unknown")}`
      );
    }
  } catch (error) {
    // Allow retry on next webhook/replay if email/PDF failed
    await Order.findByIdAndUpdate(orderId, { automatedMailSent: false });
    throw error;
  }

  return { ok: true, reason: "fulfilled", order: emailClaim };
}

/**
 * Reverse event capacity / revenue for an unpaid or cancelled checkout.
 */
export async function reverseOrderInventory(order) {
  if (!order || order.paymentStatus) return;

  const event = await Event.findById(order.eventId);
  if (!event) return;

  const tickets = order.tickets || [];
  tickets.forEach((t) => {
    event.tickets = event.tickets?.map((foundTicket) => {
      if (foundTicket._id.toString() === t.ticketId?.toString()) {
        const plain = foundTicket.toObject?.() ?? foundTicket;
        return {
          ...plain,
          ticketOrders: Math.max(
            0,
            (foundTicket.ticketOrders || 0) - (t.noOfTickets || 0)
          ),
          revenue: Math.max(
            0,
            (foundTicket.revenue || 0) -
              (foundTicket.price || 0) * (t.noOfTickets || 0)
          ),
          remainingCapacity:
            (foundTicket.remainingCapacity || 0) + (t.noOfTickets || 0),
        };
      }
      return foundTicket;
    });
  });

  event.ticketsSold = Math.max(0, (event.ticketsSold || 0) - order.noOfTickets);
  event.revenue = Math.max(0, (event.revenue || 0) - order.orderAmount);
  await event.save();
}
