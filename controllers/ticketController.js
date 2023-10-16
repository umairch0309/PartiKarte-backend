import { calculatePriceWithVAT } from "../helpers/helpers.js";
import { findBusinessAndUser } from "../DAL/common.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import Event from "../models/event.js";
import uploadS3Image from "../utils/uploadS3Image.js";

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
    questions,
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
      questions,
      descriptionWeb,
      descriptionTicket,
      remainingCapacity:
        capacityLimitation == "true" && parseInt(maxCapacity) > 0
          ? parseInt(maxCapacity)
          : 999999999,
      ticketAppearance: {
        logo: business?.organizerImage,
        organizerName: business?.company?.companyName,
        organizerAddress: business?.company?.companyAddress,
        companyName: business?.company?.companyName,
        companyAddress: business?.company?.companyAddress,
        companyVAT: business?.company?.companyVAT,
        ticketName,
        eventAddress: event.eventAddress,
        entryTimeWithTicket: event.eventStart,
        eventStart: event.eventStart,
        eventEnd: event.eventEnd,
      },
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
    paidTicket,
    price,
    vatPercentage,
    descriptionWeb,
    ticketType,
    descriptionTicket,
    questions,
  } = req.body;

  console.log(req.body, "req.body");

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return next(new HttpError("Event not found", 404));
    }

    const ticketIndex = event.tickets.findIndex((ticket) => {
      return ticket._id.toString() === ticketId;
    });

    if (ticketIndex === -1) {
      return next(new HttpError("Ticket not found", 404));
    }

    const { vat, priceWithVAT } = calculatePriceWithVAT(price, vatPercentage);

    const calculatedMax =
      capacityLimitation == true && parseInt(maxCapacity) > 0
        ? parseInt(maxCapacity)
        : 999999999;

    // Update the properties of the existing ticket directly
    event.tickets[ticketIndex].ticketName = ticketName;
    event.tickets[ticketIndex].validFrom = validFrom;
    event.tickets[ticketIndex].validTo = validTo;
    event.tickets[ticketIndex].questions = questions;
    event.tickets[ticketIndex].maxCapacity = calculatedMax;
    event.tickets[ticketIndex].ticketType = ticketType;
    event.tickets[ticketIndex].capacityLimitation =
      capacityLimitation == true && parseInt(maxCapacity) > 0
        ? "limited"
        : "unlimited";
    event.tickets[ticketIndex].paymentType =
      paidTicket == true && parseFloat(price) > 0 ? "paid" : "free";
    event.tickets[ticketIndex].price =
      paidTicket == true && parseFloat(price) > 0 ? parseFloat(price) : 0;
    event.tickets[ticketIndex].vatPercentage = vatPercentage;
    event.tickets[ticketIndex].vat = vat;
    event.tickets[ticketIndex].priceWithVAT = priceWithVAT;
    event.tickets[ticketIndex].descriptionWeb = descriptionWeb;
    event.tickets[ticketIndex].descriptionTicket = descriptionTicket;
    event.tickets[ticketIndex].remainingCapacity =
      calculatedMax - parseInt(event.tickets[ticketIndex].ticketOrders);

    await event.save();

    res
      .status(200)
      .json({ message: "Ticket updated", ticket: event.tickets[ticketIndex] });
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

export const updateTicketAppearance = async (req, res, next) => {
  const userId = req.userId;
  const eventId = req.params.eventId;
  const ticketId = req.params.ticketId;
  const {
    organizerName,
    organizerAddress,
    organizerPostalCode,
    organizerCountry,
    organizerCity,
    companyName,
    companyVAT,
    companyAddress,
    companyPostalCode,
    companyCountry,
    companyCity,
    ticketName,
    emailContent,
    eventAddress,
    eventPostalCode,
    eventCountry,
    eventCity,
    entryTimeWithTicket,
    eventStart,
    eventEnd,
    showCompanyInfo,
    showOrganizerInfo,
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
    let imageLink = null;

    if (req.files?.length > 0 && req.files[0].mimetype.startsWith("image/")) {
      const uploadedImage = await uploadS3Image(
        req.files[0],
        "ticket_logo/",
        next
      );
      if (uploadedImage.uploadedImagePath && uploadedImage.status) {
        imageLink = uploadedImage.uploadedImagePath;
      }
    }

    const ticketAppearance = {
      logo: imageLink ? imageLink : req.body.logo,
      organizerName,
      ticketName,
      emailContent,
      companyName,
      companyVAT,
      entryTimeWithTicket: new Date(entryTimeWithTicket),
      eventStart: new Date(eventStart),
      eventEnd: new Date(eventEnd),
      showCompanyInfo,
      showOrganizerInfo,
      organizerAddress: {
        addressDescription: organizerAddress,
        postalCode: organizerPostalCode,
        country: organizerCountry,
        city: organizerCity,
      },
      eventAddress: {
        addressDescription: eventAddress,
        postalCode: eventPostalCode,
        country: eventCountry,
        city: eventCity,
      },
      companyAddress: {
        addressDescription: companyAddress,
        postalCode: companyPostalCode,
        country: companyCountry,
        city: companyCity,
      },
    };

    event.tickets[ticketIndex].ticketAppearance = ticketAppearance;

    await event.save();

    res.status(200).json({ message: "Ticket appearance updated." });
  } catch (error) {
    return next(ServerError(error));
  }
};
