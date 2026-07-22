import Notification from "../models/notification.js";

/**
 * Create an in-app notification for a business (best-effort, never throws).
 */
export async function createBusinessNotification({
  businessId,
  title,
  description,
  type = "system",
  orderId,
  eventId,
  link,
  meta,
}) {
  try {
    if (!businessId || !title || !description) return null;

    return await Notification.create({
      businessId,
      title,
      description,
      type,
      orderId,
      eventId,
      link: link || "/business/orders",
      meta: meta || {},
    });
  } catch (error) {
    console.error("createBusinessNotification failed:", error?.message || error);
    return null;
  }
}

export async function notifyNewPaidOrder({ order, eventName }) {
  const tickets = order?.noOfTickets || 0;
  const shortId = String(order?._id || "").slice(-6).toUpperCase();

  return createBusinessNotification({
    businessId: order.businessId,
    title: "New order received",
    description: `Order #${shortId} was placed for ${eventName || "your event"} (${tickets} ticket${tickets === 1 ? "" : "s"}).`,
    type: "order",
    orderId: order._id,
    eventId: order.eventId,
    link: "/business/orders",
    meta: {
      customerName: order.customerName,
      orderAmount: order.orderAmount,
      noOfTickets: tickets,
    },
  });
}

export async function notifyTicketPurchase({ order, eventName }) {
  const tickets = order?.noOfTickets || 0;

  return createBusinessNotification({
    businessId: order.businessId,
    title: "Ticket purchased",
    description: `${order.customerName || "A customer"} bought ${tickets} ticket${tickets === 1 ? "" : "s"} for ${eventName || "your event"}.`,
    type: "ticket",
    orderId: order._id,
    eventId: order.eventId,
    link: "/business/orders",
    meta: {
      customerEmail: order.customerEmail,
      noOfTickets: tickets,
    },
  });
}

export async function notifyOrderRefund({ order, refundedAmount }) {
  const shortId = String(order?._id || "").slice(-6).toUpperCase();

  return createBusinessNotification({
    businessId: order.businessId,
    title: "Order refunded",
    description: `Refund of ${refundedAmount} processed for order #${shortId}.`,
    type: "refund",
    orderId: order._id,
    eventId: order.eventId,
    link: "/business/orders",
  });
}
