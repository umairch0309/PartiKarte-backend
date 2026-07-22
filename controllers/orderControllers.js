import Event from "../models/event.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import Order from "../models/order.js";
import mongoose from "mongoose";
import { findBusinessAndUser } from "../DAL/common.js";
import generateTickets from "../helpers/generateTickets.js";
import { SendTicketEmail } from "../helpers/sendEmail.js";
import generateInvoice from "../helpers/generateInvoice.js";
import {
  buildTicketEmailAttachments,
  saveOrderDocuments,
} from "../helpers/orderDocuments.js";
import Business from "../models/business.js";
import Coupon from "../models/coupon.js";
import { currencySymbolGenerator } from "../helpers/helpers.js";
import { calculateFeeSplit } from "../helpers/stripeFees.js";
import { PLATFORM_FEE_PERCENT } from "../config/stripe.js";
import {
  convertToEurWithRates,
  getRatesFromEur,
  normalizeCurrency,
  roundMoney,
} from "../helpers/currency.js";
import {
  notifyNewPaidOrder,
  notifyTicketPurchase,
} from "../services/notifications.js";

function amountInEur(order, field, rates) {
  return convertToEurWithRates(order[field], order.currency, rates);
}

function toLocalHourBucket(dateInput) {
  const d = new Date(dateInput);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

function monthNameToNumber(monthName) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months.indexOf(monthName);
}

export const createFreeOrder = async (req, res, next) => {
  const {
    eventId,
    recommendations,
    tickets,
    noOfTickets,
    orderAmount,
    customerEmail,
    customerName,
  } = req.body;
  try {
    const eventRef = await Event.findById(eventId);
    if (!eventRef) {
      return next(new HttpError("Event not found", 404));
    }
    const actualTickets = JSON.parse(tickets)?.filter(
      (ticket) => ticket.noOfTickets > 0
    );
    const transformedTickets = actualTickets.map((ticket) => {
      return {
        ticketId: ticket.ticketId,
        noOfTickets: ticket.noOfTickets,
        allQuestions: ticket.allQuestions,
      };
    });

    const neworder = new Order({
      eventId: new mongoose.Types.ObjectId(eventId),
      recommendations: recommendations === "true",
      tickets: transformedTickets,
      noOfTickets: parseInt(noOfTickets),
      orderAmount: parseInt(orderAmount),
      customerEmail,
      customerName,
      paymentStatus: true,
      businessId: eventRef?.businessId,
      automatedMailSent: true,
    });

    actualTickets?.forEach((t) => {
      eventRef.tickets = eventRef.tickets?.map((foundTicket) => {
        if (foundTicket._id.toString() === t.ticketId) {
          return {
            ...foundTicket,
            ticketOrders: foundTicket?.ticketOrders + t?.noOfTickets,
            revenue: foundTicket.revenue + t.price * t?.noOfTickets,
            remainingCapacity: foundTicket.remainingCapacity - t?.noOfTickets,
          };
        } else {
          return foundTicket;
        }
      });
    });

    eventRef.ticketsSold += parseInt(noOfTickets);
    eventRef.revenue += parseInt(orderAmount);

    const savedEvent = await eventRef.save();

    if (savedEvent) {
      await neworder.save();
    } else {
      return res.status(500).send({ message: "Server error" });
    }

    for (let i = 0; i < transformedTickets.length; i++) {
      const ticket = transformedTickets[i];
      ticket.qrCodeData = `orderId=${neworder?._id}&&eventId=${eventRef?._id}&&ticketId=${ticket?.ticketId}&&id=`;

      const foundTicket = eventRef?.tickets.find(
        (t) => t._id?.toString() === ticket?.ticketId
      );

      console.log(ticket?.qrCodeData, "qr code data");

      ticket.ticketAppearance = {
        ...foundTicket?.ticketAppearance,
        eventName: eventRef?.eventName,
        eventVenue: eventRef?.eventVenue,
        ticketPrice: foundTicket?.price,
        ticketVat: foundTicket?.vat,
        descriptionTicket: foundTicket?.descriptionTicket,
        currency: currencySymbolGenerator(eventRef?.eventCurrency),
      };
    }
    console.log(transformedTickets, "transformed tickets");

    const pdfResult = await generateTickets(transformedTickets);
    console.log(pdfResult, "pdf result");

    const business = await Business.findById(eventRef?.businessId);
    const invoiceResult = await generateInvoice({
      order: neworder,
      business,
      vatAmount: 0,
      currency: currencySymbolGenerator(eventRef?.eventCurrency),
      tickets: transformedTickets,
      type: "Free Order - Online",
    });

    console.log(invoiceResult, "invoice result");

    await notifyNewPaidOrder({
      order: neworder,
      eventName: eventRef?.eventName,
    });
    await notifyTicketPurchase({
      order: neworder,
      eventName: eventRef?.eventName,
    });

    const savedDocs = saveOrderDocuments({
      orderId: neworder._id.toString(),
      pdfResult,
      invoiceResult,
    });
    await SendTicketEmail({
      email: customerEmail,
      customerName,
      eventName: eventRef?.eventName,
      documentLinks: savedDocs.files,
      attachments: buildTicketEmailAttachments(pdfResult, invoiceResult),
    });

    res.status(201).send({
      message: "Order has been saved successfully. Please check your email.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Server error" });
  }
};

export const createBankPaymentOrder = async (req, res, next) => {
  const {
    eventId,
    recommendations,
    tickets,
    noOfTickets,
    orderAmount,
    orderVatAmount,
    customerEmail,
    customerName,
    city,
    country,
    postalCode,
    addressDescription,
    couponCode,
  } = req.body;
  try {
    const eventRef = await Event.findById(eventId);
    if (!eventRef) {
      return next(new HttpError("Event not found", 404));
    }
    const actualTickets = JSON.parse(tickets)?.filter(
      (ticket) => ticket.noOfTickets > 0
    );
    const transformedTickets = actualTickets.map((ticket) => {
      return {
        ticketId: ticket.ticketId,
        noOfTickets: ticket.noOfTickets,
      };
    });

    let recievedToken;

    const tokenUrl =
      "https://api-oauth.bankart.si/psd2/skb/sandbox/oauth2/token";
    const clientId = "f8ec4fa716fcd3bfe1ece10e131bb5a8";
    const code =
      "AANNq0z-OOSOORVQqsT9OlENetzg7I4QqpC8GUyoMKBRkZiBydlvX-FXPtzw3Ocm-X_krGHrivbVXgMvVMEjFTjzOHxkLMO-ZxgNdhASOcsC7g";

    const tokenGettingData = {
      grant_type: "authorization_code",
      client_id: clientId,
      code: code,
    };

    const headersToGetToken = {
      "Content-Type": "application/x-www-form-urlencoded",
      accept: "application/json",
    };

    // axios
    //   .post(tokenUrl, new URLSearchParams(tokenGettingData), {
    //     headersToGetToken,
    //   })
    //   .then((response) => {
    //     console.log("Token response:", response?.data);
    //     recievedToken = response?.data?.access_token;
    //   })
    //   .catch((error) => {
    //     console.error(
    //       "Error making token request:",
    //       error.response ? error.response.data : error.message
    //     );
    //   });

    const foundCoupon = await Coupon.findOne({ code: couponCode });
    const feeSplit = calculateFeeSplit(
      parseFloat(orderAmount),
      PLATFORM_FEE_PERCENT
    );

    const neworder = new Order({
      eventId: new mongoose.Types.ObjectId(eventId),
      recommendations: recommendations === "true",
      tickets: transformedTickets,
      noOfTickets: parseInt(noOfTickets),
      orderAmount: feeSplit.orderAmount,
      platformFeeAmount: feeSplit.platformFeeAmount,
      netToBusiness: feeSplit.netToBusiness,
      currency: eventRef?.eventCurrency || "EUR",
      customerEmail,
      customerName,
      paymentStatus: true,
      couponCode,
      customerAddress: {
        city,
        country,
        postalCode,
        addressDescription,
      },
      couponId: foundCoupon?._id,
      businessId: eventRef?.businessId,
      automatedMailSent: true,
    });

    actualTickets?.forEach((t) => {
      eventRef.tickets = eventRef.tickets?.map((foundTicket) => {
        if (foundTicket._id.toString() === t.ticketId) {
          return {
            ...foundTicket,
            ticketOrders: foundTicket?.ticketOrders + t?.noOfTickets,
            revenue: foundTicket.revenue + t.price * t?.noOfTickets,
            remainingCapacity: foundTicket.remainingCapacity - t?.noOfTickets,
          };
        } else {
          return foundTicket;
        }
      });
    });

    eventRef.ticketsSold += parseInt(noOfTickets);
    eventRef.revenue += parseFloat(orderAmount);

    const savedEvent = await eventRef.save();

    if (savedEvent) {
      await neworder.save();
    } else {
      return res.status(500).send({ message: "Server error" });
    }

    for (let i = 0; i < transformedTickets.length; i++) {
      const ticket = transformedTickets[i];
      ticket.qrCodeData = `orderId=${neworder?._id}&&eventId=${eventRef?._id}&&ticketId=${ticket?.ticketId}&&id=`;
      const foundTicket = eventRef?.tickets.find(
        (t) => t._id?.toString() === ticket?.ticketId
      );
      ticket.ticketAppearance = {
        ...foundTicket?.ticketAppearance,
        eventName: eventRef?.eventName,
        eventVenue: eventRef?.eventVenue,
        ticketPrice: foundTicket?.price,
        ticketVat: foundTicket?.vat,
        descriptionTicket: foundTicket?.descriptionTicket,
        currency: currencySymbolGenerator(eventRef?.eventCurrency),
      };
    }
    console.log(transformedTickets, "transformed tickets");

    const pdfResult = await generateTickets(transformedTickets);

    console.log(pdfResult, "pdf result");

    const business = await Business.findById(eventRef?.businessId);
    await Business.findByIdAndUpdate(business?._id, {
      earnings: {
        currentBalance:
          (business?.earnings?.currentBalance || 0) + feeSplit.netToBusiness,
        totalEarnings:
          (business?.earnings?.totalEarnings || 0) + feeSplit.netToBusiness,
      },
    });

    const totalVatCalculated = () => {
      let total = 0;
      transformedTickets?.forEach((ticket) => {
        if (ticket?.noOfTickets > 0) {
          for (let i = 0; i < ticket?.noOfTickets; i++) {
            total += parseFloat(ticket?.ticketAppearance?.ticketVat);
          }
        }
      });
      console.log(total, "total vat calculated");
      return total;
    };

    const invoiceResult = await generateInvoice({
      order: neworder,
      vatAmount: totalVatCalculated() || 0,
      business,
      tickets: transformedTickets,
      currency: currencySymbolGenerator(eventRef?.eventCurrency),
      type: "Bank Transfer - Online",
    });

    console.log(invoiceResult, "invoice result");

    await notifyNewPaidOrder({
      order: neworder,
      eventName: eventRef?.eventName,
    });
    await notifyTicketPurchase({
      order: neworder,
      eventName: eventRef?.eventName,
    });

    const savedDocs = saveOrderDocuments({
      orderId: neworder._id.toString(),
      pdfResult,
      invoiceResult,
    });
    await SendTicketEmail({
      email: customerEmail,
      customerName,
      eventName: eventRef?.eventName,
      documentLinks: savedDocs.files,
      attachments: buildTicketEmailAttachments(pdfResult, invoiceResult),
    });

    res.status(201).send({ message: "Order has been saved successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Server error" });
  }
};

export const getLatestOrders = async (req, res, next) => {
  try {
    const { userId } = req;
    console.log(userId, "ates orders");

    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const daysAgo = 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    console.log(startDate);

    const latestOrders = await Order.find({
      createdAt: { $gte: startDate },
      paymentStatus: true,
      businessId: business?._id,
    })
      .sort({ createdAt: -1 })
      .populate("eventId")
      .exec();

    res.status(200).json({ message: "Latest orders", orders: latestOrders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOrdersByTimeInterval = async (req, res, next) => {
  const { interval } = req.params;
  const { eventId } = req.query;

  let startDate;
  let orders = [];

  try {
    const { userId } = req;

    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const rates = await getRatesFromEur();

    if (interval === "monthly") {
      const endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const query = {
        paymentStatus: true,
        businessId: business?._id,
        updatedAt: { $gte: startDate, $lte: endDate },
      };

      if (eventId && eventId !== "undefined") {
        query.eventId = eventId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount currency"
      );

      const aggregatedOrders = {};

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayKey = currentDate.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      foundOrders.forEach((order) => {
        const dayKey = order.updatedAt.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] += amountInEur(order, "orderAmount", rates);
      });

      orders = Object.entries(aggregatedOrders).map(
        ([updatedAt, orderAmount]) => ({
          updatedAt,
          orderAmount: roundMoney(orderAmount),
          currency: "EUR",
        })
      );
    } else if (interval === "yearly") {
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const endDate = new Date();
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 11);

      const query = {
        businessId: business?._id,
        paymentStatus: true,
        updatedAt: { $gte: startDate, $lte: endDate },
      };

      if (eventId && eventId !== "undefined") {
        query.eventId = eventId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount currency"
      );

      const aggregatedOrders = {};

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const monthYear = currentDate.toISOString().substring(0, 7);
        if (!aggregatedOrders[monthYear]) {
          aggregatedOrders[monthYear] = 0;
        }
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      foundOrders.forEach((order) => {
        const monthYear = order.updatedAt.toISOString().substring(0, 7);
        if (!aggregatedOrders[monthYear]) {
          aggregatedOrders[monthYear] = 0;
        }
        aggregatedOrders[monthYear] += amountInEur(order, "orderAmount", rates);
      });

      orders = Object.entries(aggregatedOrders).map(
        ([monthYear, orderAmount]) => {
          const [year, month] = monthYear.split("-");
          const monthName = monthNames[parseInt(month, 10) - 1];

          return {
            updatedAt: `${monthName} ${year}`,
            orderAmount: roundMoney(orderAmount),
            currency: "EUR",
          };
        }
      );
    } else if (interval === "weekly") {
      const endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const query = {
        businessId: business?._id,
        paymentStatus: true,
        updatedAt: { $gte: startDate, $lte: endDate },
      };

      if (eventId && eventId !== "undefined") {
        query.eventId = eventId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount currency"
      );

      const aggregatedOrders = {};

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayKey = currentDate.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      foundOrders.forEach((order) => {
        const dayKey = order?.updatedAt.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] += amountInEur(order, "orderAmount", rates);
      });

      orders = Object.entries(aggregatedOrders).map(
        ([updatedAt, orderAmount]) => ({
          updatedAt,
          orderAmount: roundMoney(orderAmount),
          currency: "EUR",
        })
      );
    } else if (interval === "daily") {
      startDate = new Date();
      const endDate = new Date(startDate);

      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(0, 0, 0, 0);

      const query = {
        businessId: business?._id,
        paymentStatus: true,
        $or: [
          { updatedAt: { $gte: startDate, $lt: endDate } },
          { createdAt: { $gte: startDate, $lt: endDate } },
        ],
      };

      if (eventId && eventId !== "undefined") {
        query.eventId = eventId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt createdAt orderAmount currency"
      );

      const aggregatedOrders = {};

      const currentDate = new Date(startDate);
      while (currentDate < endDate) {
        const hourKey = toLocalHourBucket(currentDate);
        aggregatedOrders[hourKey] = 0;
        currentDate.setHours(currentDate.getHours() + 1);
      }

      foundOrders.forEach((order) => {
        const when = order.updatedAt || order.createdAt;
        const hourKey = toLocalHourBucket(when);
        if (aggregatedOrders[hourKey] === undefined) return;
        aggregatedOrders[hourKey] += amountInEur(order, "orderAmount", rates);
      });

      orders = Object.entries(aggregatedOrders).map(
        ([updatedAt, orderAmount]) => ({
          updatedAt,
          orderAmount: roundMoney(orderAmount),
          currency: "EUR",
        })
      );
    } else {
      return res.status(400).json({ message: "Invalid interval" });
    }

    res
      .status(200)
      .json({ message: "Orders by interval", orders, currency: "EUR" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllOrdersByEvent = async (req, res, next) => {
  const { eventId } = req.params;
  try {
    if (!eventId || eventId === "undefined") {
      return next(new HttpError("Invalid Id", 404));
    }

    const latestOrders = await Order.find({
      eventId,
      paymentStatus: true,
    })
      .sort({ _id: -1 })
      .populate("eventId")
      .exec();

    res
      .status(200)
      .json({ message: "Order by event id", orders: latestOrders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBusinessRevenueByMonth = async (req, res, next) => {
  const { month } = req.params;
  const currentYear = new Date().getFullYear();

  try {
    const { userId } = req;

    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const rows = await Order.aggregate([
      {
        $match: {
          businessId: business?._id,
          paymentStatus: true,
          createdAt: {
            $gte: new Date(currentYear, monthNameToNumber(month), 1),
            $lt: new Date(currentYear, monthNameToNumber(month) + 1, 1),
          },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$currency", "EUR"] },
          totalOrders: { $sum: 1 },
          totalTicketsSold: { $sum: "$noOfTickets" },
          totalRevenue: { $sum: "$orderAmount" },
          totalPlatformFees: { $sum: "$platformFeeAmount" },
          totalNetToBusiness: { $sum: "$netToBusiness" },
        },
      },
    ]).exec();

    const rates = await getRatesFromEur();

    let totalOrders = 0;
    let totalTicketsSold = 0;
    let totalRevenue = 0;
    let totalPlatformFees = 0;
    let totalNetToBusiness = 0;

    for (const row of rows) {
      const currency = normalizeCurrency(row._id);
      totalOrders += row.totalOrders || 0;
      totalTicketsSold += row.totalTicketsSold || 0;
      totalRevenue += convertToEurWithRates(
        row.totalRevenue,
        currency,
        rates
      );
      totalPlatformFees += convertToEurWithRates(
        row.totalPlatformFees,
        currency,
        rates
      );
      totalNetToBusiness += convertToEurWithRates(
        row.totalNetToBusiness,
        currency,
        rates
      );
    }

    const data = [
      {
        currency: "EUR",
        totalOrders,
        totalTicketsSold,
        totalRevenue: roundMoney(totalRevenue),
        totalPlatformFees: roundMoney(totalPlatformFees),
        totalNetToBusiness: roundMoney(totalNetToBusiness),
      },
    ];

    res.status(200).json({ message: "revenue data", data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Lifetime finance totals for the logged-in business.
 * Sales = gross paid orders, Fees = platform fees (8%), Earnings = net to business.
 * All amounts are converted to EUR.
 */
export const getBusinessFinanceSummary = async (req, res, next) => {
  try {
    const { user, business } = await findBusinessAndUser({ _id: req.userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const rows = await Order.aggregate([
      {
        $match: {
          businessId: business._id,
          paymentStatus: true,
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$currency", "EUR"] },
          totalOrders: { $sum: 1 },
          totalSales: { $sum: { $ifNull: ["$orderAmount", 0] } },
          totalFees: {
            $sum: {
              $cond: [
                { $gt: [{ $ifNull: ["$platformFeeAmount", 0] }, 0] },
                "$platformFeeAmount",
                {
                  $round: [
                    {
                      $multiply: [{ $ifNull: ["$orderAmount", 0] }, 0.08],
                    },
                    2,
                  ],
                },
              ],
            },
          },
          totalEarnings: {
            $sum: {
              $cond: [
                { $gt: [{ $ifNull: ["$netToBusiness", 0] }, 0] },
                "$netToBusiness",
                {
                  $round: [
                    {
                      $subtract: [
                        { $ifNull: ["$orderAmount", 0] },
                        {
                          $cond: [
                            {
                              $gt: [
                                { $ifNull: ["$platformFeeAmount", 0] },
                                0,
                              ],
                            },
                            "$platformFeeAmount",
                            {
                              $round: [
                                {
                                  $multiply: [
                                    { $ifNull: ["$orderAmount", 0] },
                                    0.08,
                                  ],
                                },
                                2,
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    2,
                  ],
                },
              ],
            },
          },
        },
      },
    ]);

    const rates = await getRatesFromEur();

    let totalOrders = 0;
    let totalSales = 0;
    let totalFees = 0;
    let totalEarnings = 0;

    for (const row of rows) {
      const currency = normalizeCurrency(row._id);
      totalOrders += row.totalOrders || 0;
      totalSales += convertToEurWithRates(row.totalSales, currency, rates);
      totalFees += convertToEurWithRates(row.totalFees, currency, rates);
      totalEarnings += convertToEurWithRates(
        row.totalEarnings,
        currency,
        rates
      );
    }

    const currentBalance = Number(business?.earnings?.currentBalance || 0);

    return res.status(200).json({
      message: "Finance summary",
      data: {
        totalOrders,
        totalSales: roundMoney(totalSales),
        totalFees: roundMoney(totalFees),
        totalEarnings: roundMoney(totalEarnings),
        currentBalance: roundMoney(currentBalance),
        currency: "EUR",
        feePercent: PLATFORM_FEE_PERCENT,
      },
    });
  } catch (error) {
    console.error("getBusinessFinanceSummary", error);
    return next(ServerError(error));
  }
};
