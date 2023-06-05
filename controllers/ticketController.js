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

export const createNewTicket = async (req, res, next) => {
  const userId = req.userId;
  const eventId = req.params.eventId;
  const {
    ticketName,
    validFrom,
    validTo,
    maxCapacity,
    capacityLimitation,
    price,
    vatPercentage,
    descriptionWeb,
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

    const { vat, priceWithVAT } = calculatePriceWithVAT(price, vatPercentage);

    const newTicket = {
      ticketName,
      validFrom,
      validTo,
      maxCapacity,
      capacityLimitation,
      price,
      vatPercentage,
      vat,
      priceWithVAT,
      descriptionWeb,
      descriptionTicket,
    };

    event.tickets.push(newTicket);
    const savedEvent = await event.save();

    res.status(200).json({ message: "Ticket created", event: savedEvent });
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
      validTo,
      maxCapacity,
      capacityLimitation,
      price,
      vatPercentage,
      vat,
      priceWithVAT,
      descriptionWeb,
      descriptionTicket,
    };

    event.tickets[ticketIndex] = updatedTicket;
    const savedEvent = await event.save();

    res.status(200).json({ message: "Ticket updated", event: savedEvent });
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
