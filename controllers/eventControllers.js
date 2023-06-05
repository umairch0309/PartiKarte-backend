import business from "../models/business.js";
import Image from "../models/image.js";
import fs from "fs";
import { preprocessImage, isImageFile } from "../helpers/helpers.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import { findBusinessAndUser } from "../DAL/common.js";
import Event from "../models/event.js";
import Business from "../models/business.js";
import mongoose from "mongoose";

export const getAllEvents = async (req, res, next) => {
  const userId = req.userId;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const events = await Event.find({ businessId: business._id });

    res.status(200).json({ events });
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

  const [eventBanner] = req.files;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    const myBusiness = await Business.findById(user.businessId).session(
      session
    );
    if (!user || !business || !myBusiness) {
      await session.abortTransaction();
      session.endSession();
      return next(new HttpError("Invalid id", 400));
    }

    isImageFile(eventBanner.mimetype);

    // upload image and get link
    const eventBannerLink = "event banner image link";

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

    console.log(newEvent);
    const savedEvent = await newEvent.save({ session });

    myBusiness.events.push(savedEvent._id);
    await myBusiness.save({ session });

    if (!savedEvent) {
      await session.abortTransaction();
      session.endSession();
      return next(new HttpError("Could not create event", 500));
    }

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Event created", event: savedEvent });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
      // Upload the image and get the link
      eventBannerLink = "event banner link new";
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
  const { eventId } = req.params;
  const { userId } = req.query;

  try {
    if (!req.files.eventBanner)
      return next(new HttpError("Image not attached", 400));

    await isImageFile(req.files.eventBanner.mimetype, next);

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

export const deleteEvent = async (req, res, next) => {
  const userId = req.userId;
  const eventId = req.params.id;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    const myBusiness = await Business.findById(user.businessId).session(
      session
    );
    if (!user || !business || !myBusiness) {
      await session.abortTransaction();
      session.endSession();
      return next(new HttpError("Invalid id", 400));
    }
    const deletedEvent = await Event.findByIdAndDelete(eventId, { session });
    myBusiness.events = myBusiness.events.filter(
      (event) => event.toString() !== deletedEvent._id.toString()
    );

    await myBusiness.save({ session });

    if (!deletedEvent) {
      await session.abortTransaction();
      session.endSession();
      return next(new HttpError("Invalid event id", 400));
    }

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Event deleted", event: deletedEvent });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(new HttpError(error.message, 500));
  }
};
