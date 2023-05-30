import business from "../models/business.js";
import ticketCode from "../models/ticketCode.js";
import Image from "../models/image.js";
import path from "path";
import fs from "fs";
import {
  preprocessImage,
  isImageFile,
  generateUrlSlug,
} from "../helpers/helpers.js";
import HttpError from "../helpers/HttpError.js";

/**
 * @method  addorUpdateEvent
 * @param {*} req
 * @param {*} res
 * @returns Add a new event or update an existing one
 */

export const addorUpdateEvent = async (req, res) => {
  const userId = req.userId;
  const eventId = req.params.id;

  const {
    eventName,
    eventStart,
    eventEnd,
    eventType,
    eventCategory,
    addressDescription,
    city,
    postalCode,
    country,
    eventCoordinatesX,
    eventCoordinatesY,
    eventVenue,
    eventDescription,
  } = req.body;
  const eventStartDate = new Date(eventStart);

  try {
    let event;
    if (eventId === "new") {
      // Create a new event
      const newEvent = {
        eventName,
        eventStart,
        eventEnd,
        eventType,
        eventCategory,
        eventAddress: {
          addressDescription,
          city,
          postalCode,
          country,
        },
        eventCoordinatesX,
        eventCoordinatesY,
        eventVenue,
        eventDescription,
        urlSlug: generateUrlSlug(eventName, eventStartDate),
      };

      const user = await business.findOne({ _id: userId });
      user.events.push(newEvent);
      await user.save();
      event = user.events[user.events.length - 1];
      const eventId = event._id;
      const newCode = {
        event: eventId,
      };
      await ticketCode.create(newCode);
      res.status(200).json({ message: "Event created", eventId: event._id });
    } else {
      // Update an existing event
      const user = await business.findOne({ _id: userId });
      event = user.events.id(eventId);
      if (!event) {
        return next(new HttpError("Event not found", 404));
      }

      event.set({
        eventName,
        eventStart,
        eventEnd,
        eventType,
        eventCategory,
        eventAddress: {
          addressDescription,
          city,
          postalCode,
          country,
        },
        eventCoordinatesX,
        eventCoordinatesY,
        eventVenue,
        eventDescription,
        urlSlug: generateUrlSlug(eventName, eventStartDate),
      });

      await user.save();
      res.status(200).json({ message: "Event updated", eventId: event._id });
    }
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

export const changeEventImage = async (req, res, next) => {
  const { eventId } = req.params;
  const { userId } = req.query;

  try {
    if (!req.file) return next(new HttpError("Image not attached", 400));

    await isImageFile(req.file.mimetype);

    const optimizedPath = await preprocessImage(req.file.path);

    const newImage = new Image({
      name: req.file.originalname,
      filePath: optimizedPath,
      contentType: req.file.mimetype,
    });
    await newImage.save();
    let eventBanner = newImage._id;

    const user = await business.findOne({ _id: userId });

    let event = user.events.id(eventId);
    if (!event) {
      return next(new HttpError("Event not found", 404));
    }

    if (event.eventBanner) {
      const oldImage = await Image.findById(event.eventBanner);
      if (oldImage.filePath && fs.existsSync(oldImage.filePath)) {
        fs.unlinkSync(oldImage.filePath);
      }
      await Image.deleteOne({ _id: event.eventBanner });
    }

    event.set({ eventBanner });
    await user.save();

    res.status(201).send({ id: newImage._id });
  } catch (error) {
    console.error(error);
    return next(new HttpError(error.message, 500));
  }
};

export const deleteEvent = async (req, res) => {
  const userId = req.userId;
  const eventId = req.params.id;
  try {
    const user = await business.findOne({
      _id: userId,
      "events._id": eventId,
    });

    if (!user) {
      return next(new HttpError("Event not found", 404));
    }

    user.events.pull(eventId);
    await user.save();
    res.status(200).json({ message: "Event deleted" });
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

export const searchEvents = async (req, res) => {
  try {
    const { currentTime, featured, urlSlug } = req.body;
    const businessUsers = await business
      .find({})
      .populate("events.eventBanner");

    const events = [];

    businessUsers.forEach((user) => {
      user.events.forEach((event) => {
        // Apply filters
        if (currentTime && new Date(event.eventEnd) <= new Date(currentTime)) {
          return;
        }
        if (featured === "true" && !event.featured) {
          return;
        }
        if (urlSlug && event.urlSlug !== urlSlug) {
          return;
        }

        let lowestPriceTicket = null;

        event.tickets.forEach((ticket) => {
          if (ticket.inventory > 0) {
            if (
              lowestPriceTicket === null ||
              ticket.priceWithVAT < lowestPriceTicket.priceWithVAT
            ) {
              lowestPriceTicket = ticket;
            }
          }
        });

        const eventInfo = {
          organizerId: user._id,
          organizerName: user.organizerName,
          eventId: event._id,
          eventName: event.eventName,
          eventStart: event.eventStart,
          eventEnd: event.eventEnd,
          eventAddress: event.eventAddress,
          eventVenue: event.eventVenue,
          eventDescription: event.eventDescription,
          eventCoordinatesX: event.eventCoordinatesX,
          eventCoordinatesY: event.eventCoordinatesY,
          ticketName: lowestPriceTicket
            ? lowestPriceTicket.ticketName
            : "No available tickets",
          ticketPriceWithVAT: lowestPriceTicket
            ? lowestPriceTicket.priceWithVAT
            : null,
          eventBannerId: event.eventBanner ? event.eventBanner._id : null,
          ticketIds: event.tickets.map((ticket) => ticket._id),
          urlSlug: event.urlSlug,
        };

        events.push(eventInfo);
      });
    });

    res.status(200).json(events);
  } catch (error) {
    return next(new HttpError("Error fetching events", 500));
  }
};

export const getEventBanner = async (req, res) => {
  try {
    const imageId = req.params.id;
    const image = await Image.findById(imageId);
    if (image) {
      res.set("Content-Type", image.contentType);
      res.set("Cache-Control", "public, max-age=31536000"); // Cache the image for 1 year (in seconds)
      res.sendFile(path.resolve(image.filePath)); // Serve the file from the filesystem
    } else {
      return next(new HttpError("Image not found", 404));
    }
  } catch (error) {
    return next(new HttpError("Error fetching event banner", 500));
  }
};
