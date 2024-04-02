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
  psuIpAddress,
} from "../constants.js";
import { findBusinessAndUser } from "../DAL/common.js";
import generateTickets from "../helpers/generateTickets.js";
import { SendTicketEmail } from "../helpers/sendEmail.js";
import generateInvoice from "../helpers/generateInvoice.js";
import Business from "../models/business.js";
import Coupon from "../models/coupon.js";
import { currencySymbolGenerator } from "../helpers/helpers.js";

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

    SendTicketEmail({
      email: customerEmail,
      customerName,
      eventName: eventRef?.eventName,
      attachments: [
        ...pdfResult?.map((el, index) => ({
          content: el.toString("base64"),
          filename: `ticket${index}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        })),
        ...invoiceResult?.map((el, index) => ({
          content: el?.toString("base64"),
          filename: `Invoice.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        })),
      ],
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

    const currentDate = new Date();
    const headers = {
      "X-IBM-Client-Id": clientId,
      Authorization: "Bearer REPLACE_BEARER_TOKEN",
      "X-Request-ID": `${currentDate.getTime()}`,
      "PSU-IP-Address": psuIpAddress,
      "Initialized-By-PSU": false,
      "Content-Type": "application/json",
    };

    const foundCoupon = await Coupon.findOne({ code: couponCode });

    const neworder = new Order({
      eventId: new mongoose.Types.ObjectId(eventId),
      recommendations: recommendations === "true",
      tickets: transformedTickets,
      noOfTickets: parseInt(noOfTickets),
      orderAmount: parseFloat(orderAmount),
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
          (business?.earnings?.currentBalance || 0) + parseFloat(orderAmount),
        totalEarnings:
          (business?.earnings?.totalEarnings || 0) + parseFloat(orderAmount),
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
      type: "Free Order - Online",
    });

    console.log(invoiceResult, "invoice result");

    SendTicketEmail({
      email: customerEmail,
      customerName,
      eventName: eventRef?.eventName,
      attachments: [
        ...pdfResult?.map((el, index) => ({
          content: el.toString("base64"),
          filename: `ticket${index}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        })),
        ...invoiceResult?.map((el, index) => ({
          content: el?.toString("base64"),
          filename: `Invoice.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        })),
      ],
    });

    res.status(201).send({ message: "Order has been saved successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Server error" });
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
      orderVatAmount,
      customerEmail,
      customerName,
      city,
      country,
      postalCode,
      addressDescription,
      countryCode,
    } = req.body;

    const eventRef = await Event.findById(eventId);

    const inputBody = {
      merchantTransactionId: generateUniqueTransactionId(),
      amount: `${parseFloat(orderAmount) + parseFloat(orderVatAmount)}`,
      currency: eventRef?.eventCurrency || "EUR",
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
      merchantTransactionId: inputBody?.merchantTransactionId,
      currency: inputBody?.currency,
      recommendations: recommendations === "true",
      purchaseId: responseBody?.purchaseId,
      bankUuid: responseBody?.uuid,
      tickets: transformedTickets,
      noOfTickets: parseInt(noOfTickets),
      orderAmount: inputBody?.amount,
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
    eventRef.revenue += parseFloat(orderAmount);

    const savedEvent = await eventRef.save();

    if (savedEvent) {
      await neworder.save();
    } else {
      return res.status(500).send({ message: "Server error" });
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
    console.error(error, "error in created payment with card");
    return res.status(500).send({ message: "Server error" });
  }
};

export const apiPaymentCallback = async (req, res, next) => {
  const { purchaseId, result } = req.body;

  console.log(req.body, "payment result");
  try {
    if (result === "OK") {
      const order = await Order.findOneAndUpdate(
        { purchaseId },
        { paymentStatus: true },
        { new: true }
      );

      const event = await Event.findById(order?.eventId);
      const businessForCalc = await Business.findById(event?.businessId);

      await Business.findByIdAndUpdate(event?.businessId, {
        earnings: {
          currentBalance:
            (businessForCalc?.earnings?.currentBalance || 0) +
            parseFloat(order?.orderAmount),
          totalEarnings:
            (businessForCalc?.earnings?.totalEarnings || 0) +
            parseFloat(order?.orderAmount),
        },
      });

      if (!event) {
        console.log(" couldn't find event");
        return;
      }
      if (!order?.automatedMailSent) {
        const transformedTickets = [];

        const tickets = order.tickets;

        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          const qrCodeData = `orderId=${order?._id}&&eventId=${event?._id}&&ticketId=${ticket?.ticketId}&&id=`;

          const foundTicket = event?.tickets.find(
            (t) => t._id?.toString() === ticket?.ticketId?.toString()
          );

          transformedTickets.push({
            ticketId: ticket.ticketId,
            noOfTickets: ticket.noOfTickets,
            qrCodeData,
            ticketAppearance: {
              ...foundTicket?.ticketAppearance,
              eventName: event?.eventName,
              eventVenue: event?.eventVenue,
              ticketPrice: foundTicket?.price,
              ticketVat: foundTicket?.vat,
              descriptionTicket: foundTicket?.descriptionTicket,
              currency: currencySymbolGenerator(event?.eventCurrency),
            },
          });
        }

        const pdfResult = await generateTickets(transformedTickets);

        console.log(pdfResult, "pdf result");

        const business = await Business.findById(event?.businessId);

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
          order,
          vatAmount: totalVatCalculated() || 0,
          business,
          tickets: transformedTickets,
          currency: currencySymbolGenerator(event?.eventCurrency),
          type: "Free Order - Online",
        });

        console.log(invoiceResult, "invoice result");

        await SendTicketEmail({
          customerName: order?.customerName,
          eventName: event?.eventName,
          email: order?.customerEmail,
          attachments: [
            ...pdfResult?.map((el, index) => ({
              content: el.toString("base64"),
              filename: `ticket${index}.pdf`,
              type: "application/pdf",
              disposition: "attachment",
            })),
            ...invoiceResult?.map((el, index) => ({
              content: el?.toString("base64"),
              filename: `Invoice.pdf`,
              type: "application/pdf",
              disposition: "attachment",
            })),
          ],
        });

        await Order.findOneAndUpdate(
          { purchaseId },
          { automatedMailSent: true },
          { new: true }
        );
      }
    } else {
      const order = await Order.findOne({ purchaseId });
      if (order) {
        const event = await Event.findById(order?.eventId);
        event.revenue -= order.orderAmount;
        event.ticketsSold -= order.noOfTickets;
        await event.save();
      }
    }
    return res.status(200).send("OK");
  } catch (error) {
    return next(ServerError(error));
  }
};

export const refundOrderPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByIdAndUpdate(orderId, {
      status: "Refunded",
    });

    if (!order) {
      return res.status(404).send({ message: "Couldn't find order!" });
    }

    const eventRef = await Event.findById(order?.eventId);

    const inputBody = {
      merchantTransactionId: order?.merchantTransactionId,
      referenceUuid: order?.bankUuid,
      amount: order?.amount,
      currency: order?.currency,
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
      )}\napplication/json; charset=utf-8\n${currentDate}\n/api/v3/transaction/${apiKey}/refund`;

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
      `https://gateway.bankart.si/api/v3/transaction/${apiKey}/refund`,
      inputBody,
      { headers }
    );

    const responseBody = response.data;
    console.log(responseBody, "payment data");
    if (!responseBody.success || responseBody.success === "false") {
      return res.status(400).send({ message: "Unable to refund!" });
    }

    if (!eventRef) {
      return next(new HttpError("Event not found", 404));
    }

    eventRef.ticketsSold -= parseInt(order?.noOfTickets);
    eventRef.revenue -= parseFloat(order?.orderAmount);

    await eventRef.save();

    const businessForCalc = await Business.findById(eventRef?.businessId);

    await Business.findByIdAndUpdate(eventRef?.businessId, {
      earnings: {
        currentBalance:
          (businessForCalc?.earnings?.currentBalance || 0) -
          parseFloat(order?.orderAmount),
        totalEarnings:
          (businessForCalc?.earnings?.totalEarnings || 0) -
          parseFloat(order?.orderAmount),
      },
    });

    return res
      .status(200)
      .send({ message: "Order has been refunded successfully." });
  } catch (error) {
    console.error(error, "error in created payment with card");
    return res.status(500).send({ message: "Server error" });
  }
};

export const resendTicketsToCustomer = async (req, res, next) => {
  const { email } = req.body;
  const { orderId } = req.params;
  try {
    const order = await Order.findById(orderId);

    const event = await Event.findById(order?.eventId);

    if (!event) {
      console.log(" couldn't find event");
      return;
    }
    const transformedTickets = [];

    const tickets = order.tickets;

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const qrCodeData = `orderId=${order?._id}&&eventId=${event?._id}&&ticketId=${ticket?.ticketId}&&id=`;

      const foundTicket = event?.tickets.find(
        (t) => t._id?.toString() === ticket?.ticketId?.toString()
      );

      transformedTickets.push({
        ticketId: ticket.ticketId,
        noOfTickets: ticket.noOfTickets,
        qrCodeData,
        ticketAppearance: {
          ...foundTicket?.ticketAppearance,
          eventName: event?.eventName,
          eventVenue: event?.eventVenue,
          ticketPrice: foundTicket?.price,
          ticketVat: foundTicket?.vat,
          descriptionTicket: foundTicket?.descriptionTicket,
          currency: currencySymbolGenerator(event?.eventCurrency),
        },
      });
    }

    const pdfResult = await generateTickets(transformedTickets);

    const business = await Business.findById(event?.businessId);

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
      order,
      vatAmount: totalVatCalculated() || 0,
      business,
      tickets: transformedTickets,
      currency: currencySymbolGenerator(event?.eventCurrency),
      type: "Order - Online",
    });

    console.log(invoiceResult, "invoice result");

    await SendTicketEmail({
      customerName: order?.customerName,
      eventName: event?.eventName,
      email: email || order?.customerEmail,
      attachments: [
        ...pdfResult?.map((el, index) => ({
          content: el.toString("base64"),
          filename: `ticket${index}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        })),
        ...invoiceResult?.map((el, index) => ({
          content: el?.toString("base64"),
          filename: `Invoice.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        })),
      ],
    });

    return res.status(200).send("Successfully sent the tickets to customer!");
  } catch (error) {
    return next(ServerError(error));
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
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // 30 days ago from today

      const query = {
        paymentStatus: true,
        businessId: business?._id,
        updatedAt: { $gte: startDate },
        updatedAt: { $lte: endDate },
      };

      if (eventId && eventId !== "undefined") {
        query.eventId = eventId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount"
      );

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
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 11); // 12 months ago from today

      const query = {
        businessId: business?._id,
        paymentStatus: true,
        updatedAt: { $gte: startDate, $lte: endDate },
      };

      if (eventId && eventId !== "undefined") {
        query.eventId = eventId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount"
      );

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
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago from today

      const query = {
        businessId: business?._id,
        paymentStatus: true,
        updatedAt: { $gte: startDate, $lte: endDate },
      };

      if (eventId && eventId !== "undefined") {
        query.eventId = eventId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount"
      );

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
    } else if (interval === "daily") {
      startDate = new Date();
      const endDate = new Date(startDate); // Current date

      startDate.setHours(0, 0, 0, 0); // Set start time to midnight of the current day
      endDate.setDate(endDate.getDate() + 1);

      // Set end time to midnight of the next day
      endDate.setHours(0, 0, 0, 0);

      const query = {
        businessId: business?._id,
        paymentStatus: true,
        updatedAt: { $gte: startDate, $lte: endDate },
      };

      if (eventId && eventId !== "undefined") {
        query.eventId = eventId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount"
      );

      const aggregatedOrders = {}; // Object to store aggregated order amounts by hour

      // Initialize the aggregatedOrders object with 0 for each hour within the date range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const hourKey = currentDate.toISOString(); // Format: YYYY-MM-DDTHH
        aggregatedOrders[hourKey] = 0;
        currentDate.setHours(currentDate.getHours() + 1);
      }

      // Update aggregated order amounts based on the fetched orders
      foundOrders.forEach((order) => {
        const hourKey = order.updatedAt.toISOString(); // Format: YYYY-MM-DDTHH
        aggregatedOrders[hourKey] += order.orderAmount;
      });

      orders = Object.entries(aggregatedOrders).map(
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

  console.log(month);

  const currentYear = new Date().getFullYear();

  try {
    const { userId } = req;

    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    console.log(business, month);

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
