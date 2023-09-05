import Event from "../models/event.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import Order from "../models/order.js";
import axios from "axios";
import crypto from "crypto";
import mongoose from "mongoose";
import {
  callbackUrl,
  cancelUrl,
  errorUrl,
  successUrl,
  apiKey,
  apiPassword,
  apiUsername,
  sharedSecret,
} from "../constants.js";
import { findBusinessAndUser } from "../DAL/common.js";

function generateUniqueTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000); // Generate a random number between 0 and 999999
  return `${timestamp}-${random}`;
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
      return res.status(500).send("Server error");
    }

    res.status(201).send({ message: "Order has been saved successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
};

export const createBankPaymentOrder = async (req, res, next) => {
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

    const neworder = new Order({
      eventId: new mongoose.Types.ObjectId(eventId),
      recommendations: recommendations === "true",
      tickets: transformedTickets,
      noOfTickets: parseInt(noOfTickets),
      orderAmount: parseInt(orderAmount),
      customerEmail,
      customerName,
      paymentStatus: true,
      customerAddress: {
        city,
        country,
        postalCode,
        addressDescription,
      },
      businessId: eventRef?.businessId,
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
      return res.status(500).send("Server error");
    }

    res.status(201).send({ message: "Order has been saved successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
};

export const createCardPaymentOrder = async (req, res, next) => {
  try {
    const {
      paymentRequestToken,
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
      countryCode,
    } = req.body;

    const inputBody = {
      merchantTransactionId: generateUniqueTransactionId(),
      amount: orderAmount,
      currency: "EUR",
      transactionToken: paymentRequestToken,
      callbackUrl: callbackUrl,
      successUrl: successUrl,
      cancelUrl: cancelUrl,
      errorUrl: errorUrl,
      customer: {
        billingAddress1: addressDescription,
        billingCity: city,
        billingCountry: countryCode,
        billingPostcode: postalCode,
        email: customerEmail,
      },
      threeDSecureData: {
        "3dsecure": "MANDATORY",
      },
    };

    const credentials = `${apiUsername}:${apiPassword}`;
    const encodedCredentials = Buffer.from(credentials).toString("base64");

    const currentDate = new Date().toUTCString();
    // Prepare the message string for signing
    const message = `POST\n${crypto
      .createHash("sha512")
      .update(JSON.stringify(inputBody))
      .digest(
        "hex"
      )}\napplication/json; charset=utf-8\n${currentDate}\n/api/v3/transaction/${apiKey}/debit`;

    // Create HMAC using sha512 and base64 encode the binary result
    const signature = crypto
      .createHmac("sha512", sharedSecret)
      .update(message)
      .digest("base64");

    const headers = {
      Authorization: `Basic ${encodedCredentials}`,
      "Content-Type": "application/json; charset=utf-8",
      Date: currentDate,
      "X-Signature": signature,
    };

    const response = await axios.post(
      `https://gateway.bankart.si/api/v3/transaction/${apiKey}/debit`,
      inputBody,
      { headers }
    );

    const responseBody = response.data;
    console.log(responseBody, "payment data");
    if (!responseBody.success || responseBody.success === "false") {
      return res.status(400).send({ message: "Payment declined" });
    }

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

    const neworder = new Order({
      eventId: new mongoose.Types.ObjectId(eventId),
      recommendations: recommendations === "true",
      purchaseId: responseBody?.purchaseId,
      bankUuid: responseBody?.uuid,
      tickets: transformedTickets,
      noOfTickets: parseInt(noOfTickets),
      orderAmount: parseInt(orderAmount),
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
      return res.status(500).send("Server error");
    }

    if (
      responseBody.returnType === "REDIRECT" &&
      responseBody.redirectType === "iframe"
    ) {
      return res.status(201).send({
        message: "Order has been saved and needs redirection.",
        data: {
          redirectUrl: responseBody.redirectUrl,
          returnType: responseBody.returnType,
          redirectType: responseBody.redirectType,
        },
      });
    }
    return res
      .status(201)
      .send({ message: "Order has been saved successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Server error" });
  }
};

export const apiPaymentCallback = async (req, res, next) => {
  const { purchaseId, result } = req.body;
  try {
    if (result === "OK") {
      const order = await Order.findOneAndUpdate(
        { purchaseId },
        { paymentStatus: true },
        { new: true }
      );
    } else {
      const order = Order.findOne({ purchaseId });
      if (order) {
        const event = await Event.findById(order?.eventId);
        event.revenue -= order.orderAmount;
        event.ticketsSold -= order.noOfTickets;
        await event.save();
      }
    }
    return res.status(200).send("OK");
  } catch (error) {
    console.error(error);
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

    const daysAgo = 10;
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
  const currentDate = new Date();

  let startDate;
  let orders = [];

  try {
    const { userId } = req;
    console.log(userId, "ates orders");

    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    if (interval === "monthly") {
      const endDate = new Date(); // Today's date
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // 30 days ago from today

      console.log(eventId, "eventId");

      const foundOrders = await Order.find({
        paymentStatus: true,
        businessId: business?._id,
        ...(eventId && { eventId }),
        updatedAt: { $gte: startDate },
        updatedAt: { $lte: endDate },
      }).select("updatedAt orderAmount");

      const aggregatedOrders = {}; // Object to store aggregated order amounts by day

      // Initialize the aggregatedOrders object with 0 for each day within the date range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayKey = currentDate.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Update aggregated order amounts based on the fetched orders
      foundOrders.forEach((order) => {
        const dayKey = order.updatedAt.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] += order.orderAmount;
      });

      orders = Object.entries(aggregatedOrders).map(
        ([updatedAt, orderAmount]) => ({
          updatedAt,
          orderAmount,
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

      const endDate = new Date(); // Today's date
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 11); // 12 months ago from today

      const foundOrders = await Order.find({
        businessId: business?._id,
        paymentStatus: true,
        ...(eventId && { eventId }),
        updatedAt: { $gte: startDate, $lte: endDate },
      }).select("updatedAt orderAmount");

      const aggregatedOrders = {}; // Object to store aggregated order amounts by month

      // Loop through the last 12 months and initialize aggregated order amounts
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const monthYear = currentDate.toISOString().substring(0, 7); // Format: YYYY-MM
        if (!aggregatedOrders[monthYear]) {
          aggregatedOrders[monthYear] = 0;
        }
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Loop through each order and update aggregated order amounts by month
      foundOrders.forEach((order) => {
        const monthYear = order.updatedAt.toISOString().substring(0, 7); // Format: YYYY-MM
        if (!aggregatedOrders[monthYear]) {
          aggregatedOrders[monthYear] = 0;
        }
        aggregatedOrders[monthYear] += order.orderAmount;
      });

      orders = Object.entries(aggregatedOrders).map(
        ([monthYear, orderAmount]) => {
          const [year, month] = monthYear.split("-");
          const monthName = monthNames[parseInt(month, 10) - 1]; // Month is 0-indexed

          return {
            updatedAt: `${monthName} ${year}`,
            orderAmount,
          };
        }
      );
    } else if (interval === "weekly") {
      const endDate = new Date(); // Today's date
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago from today

      // You can replace 'yourEventId' with the actual event ID you want to filter by

      const foundOrders = await Order.find({
        businessId: business?._id,
        paymentStatus: true,
        ...(eventId && { eventId }),
        updatedAt: { $gte: startDate, $lte: endDate },
      }).select("updatedAt orderAmount");

      const aggregatedOrders = {}; // Object to store aggregated order amounts by day

      // Initialize the aggregatedOrders object with 0 for each day within the date range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayKey = currentDate.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Update aggregated order amounts based on the fetched orders
      foundOrders.forEach((order) => {
        const dayKey = order?.updatedAt.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] += order?.orderAmount;
      });

      orders = Object.entries(aggregatedOrders)?.map(
        ([updatedAt, orderAmount]) => ({
          updatedAt,
          orderAmount,
        })
      );
    } else {
      return res.status(400).json({ message: "Invalid interval" });
    }
    res.status(200).json({ message: "Orders by interval", orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllOrdersByEvent = async (req, res, next) => {
  const { eventId } = req.params;
  try {
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

    const data = await Order.aggregate([
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
          _id: "$businessId",
          totalOrders: { $sum: 1 },
          totalTicketsSold: { $sum: "$noOfTickets" },
          totalRevenue: { $sum: "$orderAmount" },
        },
      },
    ]).exec();

    res.status(200).json({ message: "revenue data", data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
