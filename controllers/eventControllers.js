import business from "../models/business.js";
import Image from "../models/image.js";
import fs from "fs";
import { preprocessImage, isImageFile } from "../helpers/helpers.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import { findBusinessAndUser } from "../DAL/common.js";
import Event from "../models/event.js";
import Business from "../models/business.js";
import mongoose from "mongoose";
import uploadS3Image from "../utils/uploadS3Image.js";

export const getAllEvents = async (req, res, next) => {
  const userId = req.userId;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const events = await Event.find({ businessId: business._id }).sort({
      _id: -1,
    });

    res.status(200).json({ events });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const getEvent = async (req, res, next) => {
  const userId = req.userId;
  const { eventId } = req.params;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const event = await Event.findById(eventId);

    res.status(200).json({ event });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const createNewEvent = async (req, res, next) => {
  const userId = req.userId;
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

  const eventBanner = req.files[0];

  console.log(eventBanner);

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    const myBusiness = await Business.findById(user.businessId);
    if (!user || !business || !myBusiness) {
      return next(new HttpError("Invalid id", 400));
    }

    isImageFile(eventBanner.mimetype, next);

    const uploadedEventBanner = await uploadS3Image(
      eventBanner,
      "event_banners/",
      next
    );

    let eventBannerLink = "";

    if (uploadedEventBanner.uploadedImagePath && uploadedEventBanner.status) {
      eventBannerLink = uploadedEventBanner.uploadedImagePath;
    }

    const newEvent = new Event({
      eventName,
      eventStart,
      eventEnd,
      eventType,
      eventBanner: eventBannerLink,
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
      businessId: myBusiness._id,
    });

    const savedEvent = await newEvent.save();

    if (savedEvent) {
      myBusiness.events.push(savedEvent._id);
      await myBusiness.save();
    }

    if (!savedEvent) {
      return next(new HttpError("Could not create event", 500));
    }
    res.status(200).json({ message: "Event created", event: savedEvent });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const updateEvent = async (req, res, next) => {
  const userId = req.userId;
  const eventId = req.params.eventId;
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
  const [eventBanner] = req.files;

  console.log(req.files);

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    let eventBannerLink = "";

    if (eventBanner && eventBanner.mimetype.startsWith("image/")) {
      const uploadedEventBanner = await uploadS3Image(
        eventBanner,
        "event_banners/",
        next
      );
      if (uploadedEventBanner.uploadedImagePath && uploadedEventBanner.status) {
        eventBannerLink = uploadedEventBanner.uploadedImagePath;
      }
    } else {
      eventBannerLink = req.body.eventBanner;
    }

    const updatedEvent = {
      eventName,
      eventStart,
      eventEnd,
      eventType,
      eventBanner: eventBannerLink,
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
    };

    // Update the event in the database
    const updatedEventObj = await Event.findByIdAndUpdate(
      eventId,
      updatedEvent,
      { new: true }
    );

    if (!updatedEventObj) {
      return next(new HttpError("Could not update event", 500));
    }

    res.status(200).json({ message: "Event updated", event: updatedEventObj });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const changeEventImage = async (req, res, next) => {
  const userId = req.userId;
  const eventId = req.params.eventId;
  const [eventBanner] = req.files;

  console.log(eventBanner);

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return next(new HttpError("Invalid event id", 400));
    }

    isImageFile(eventBanner.mimetype, next);

    const uploadedEventBanner = await uploadS3Image(
      eventBanner,
      "event_banners/",
      next
    );
    if (uploadedEventBanner.uploadedImagePath && uploadedEventBanner.status) {
      event.eventBanner = uploadedEventBanner.uploadedImagePath;
      event.save();
    }

    res.status(201).send({ event });
  } catch (error) {
    console.error(error);
    return next(new HttpError(error.message, 500));
  }
};

export const deleteEvent = async (req, res, next) => {
  const userId = req.userId;
  const eventId = req.params.id;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    const myBusiness = await Business.findById(user.businessId);

    if (!user || !business || !myBusiness) {
      return next(new HttpError("Invalid id", 400));
    }

    const deletedEvent = await Event.findByIdAndDelete(eventId);

    if (!deletedEvent) {
      return next(new HttpError("Invalid event id", 400));
    }

    myBusiness.events = myBusiness.events.filter(
      (event) => event.toString() !== deletedEvent._id.toString()
    );
    if (deletedEvent) {
      await myBusiness.save();
    }

    res.status(200).json({ message: "Event deleted", event: deletedEvent });
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};
