import { calculatePriceWithVAT } from "../helpers/helpers.js";
import { findBusinessAndUser } from "../DAL/common.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import Event from "../models/event.js";

export const getAllTickets = async (req, res, next) => {
  const userId = req.userId;
  const eventId = req.params.eventId;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return next(new HttpError("Event not found", 404));
    }

    res.status(200).json({ message: "All tickets", tickets: event.tickets });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const getTicket = async (req, res, next) => {
  const userId = req.userId;
  const eventId = req.params.eventId;
  const ticketId = req.params.ticketId;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return next(new HttpError("Event not found", 404));
    }

    const ticket = event.tickets.filter(
      (ticket) => ticket._id.toString() === ticketId
    );

    if (!ticket[0]) {
      return next(new HttpError("Ticket not found", 404));
    }

    res.status(200).json({ message: "Ticket found", ticket: ticket[0] });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const createNewTicket = async (req, res, next) => {
  const userId = req.userId;
  const eventId = req.params.eventId;
  const {
    ticketName,
    validFrom,
    validTo,
    maxCapacity,
    capacityLimitation,
    paidTicket,
    price,
    vatPercentage,
    descriptionWeb,
    descriptionTicket,
    ticketType,
  } = req.body;

  console.log(req.body);

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new HttpError("Event not found", 404));
    }

    const { vat, priceWithVAT } = calculatePriceWithVAT(
      paidTicket == "true" && parseFloat(price) > 0 ? parseFloat(price) : 0,
      vatPercentage
    );

    const newTicket = {
      ticketName,
      validFrom,
      validTo,
      ticketType,
      maxCapacity:
        capacityLimitation == "true" && parseInt(maxCapacity) > 0
          ? parseInt(maxCapacity)
          : 999999999,
      capacityLimitation:
        capacityLimitation == "true" && parseInt(maxCapacity) > 0
          ? "limited"
          : "unlimited",
      paymentType:
        paidTicket == "true" && parseFloat(price) > 0 ? "paid" : "free",
      price:
        paidTicket == "true" && parseFloat(price) > 0 ? parseFloat(price) : 0,
      vatPercentage,
      vat,
      priceWithVAT,
      descriptionWeb,
      descriptionTicket,
      remainingCapacity:
        capacityLimitation == "true" && parseInt(maxCapacity) > 0
          ? parseInt(maxCapacity)
          : 999999999,
    };

    event.tickets.push(newTicket);
    const savedEvent = await event.save();

    if (!savedEvent) {
      return next(new HttpError("Something went wrong!", 500));
    }

    res.status(200).json({
      message: "Ticket created successfully for selected event.",
      ticket: newTicket,
    });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const updateTicket = async (req, res, next) => {
  const userId = req.userId;
  const eventId = req.params.eventId;
  const ticketId = req.params.ticketId;
  const {
    ticketName,
    validFrom,
    validTo,
    maxCapacity,
    capacityLimitation,
    price,
    vatPercentage,
    descriptionWeb,
    ticketType,
    descriptionTicket,
  } = req.body;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return next(new HttpError("Event not found", 404));
    }

    const ticketIndex = event.tickets.findIndex(
      (ticket) => ticket._id.toString() === ticketId
    );
    if (ticketIndex === -1) {
      return next(new HttpError("Ticket not found", 404));
    }

    const { vat, priceWithVAT } = calculatePriceWithVAT(price, vatPercentage);

    const updatedTicket = {
      _id: ticketId, // Maintain the same mongoose ObjectId
      ticketName,
      validFrom,
      ticketType,
      validTo,
      maxCapacity:
        capacityLimitation == "true" && parseInt(maxCapacity) > 0
          ? parseInt(maxCapacity)
          : 999999999,
      capacityLimitation:
        capacityLimitation == "true" && parseInt(maxCapacity) > 0
          ? "limited"
          : "unlimited",
      paymentType:
        paidTicket == "true" && parseFloat(price) > 0 ? "paid" : "free",
      price:
        paidTicket == "true" && parseFloat(price) > 0 ? parseFloat(price) : 0,
      vatPercentage,
      vat,
      priceWithVAT,
      descriptionWeb,
      descriptionTicket,
    };

    event.tickets[ticketIndex] = updatedTicket;
    await event.save();

    res.status(200).json({ message: "Ticket updated", ticket: updatedTicket });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const deleteTicket = async (req, res, next) => {
  const userId = req.userId;
  const eventId = req.params.eventId;
  const ticketId = req.params.ticketId;

  console.log(eventId);
  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return next(new HttpError("Event not found", 404));
    }

    const ticketIndex = event.tickets.findIndex(
      (ticket) => ticket._id.toString() === ticketId
    );
    if (ticketIndex === -1) {
      return next(new HttpError("Ticket not found", 404));
    }

    const deletedTicket = event.tickets.splice(ticketIndex, 1)[0];

    // Populate the businessId field from the existing event
    const updatedEvent = await event.save({ validateBeforeSave: false });
    console.log(updatedEvent._id);
    res.status(200).json({
      message: "Ticket deleted",
      ticket: deletedTicket,
      event: updatedEvent,
    });
  } catch (error) {
    return next(ServerError(error));
  }
};
