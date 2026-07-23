import { preprocessImage, isImageFile } from "../helpers/helpers.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import { findBusinessAndUser } from "../DAL/common.js";
import Event from "../models/event.js";
import Business from "../models/business.js";
import uploadS3Image from "../utils/uploadS3Image.js";

function generateRandomCode(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
}

export const getAllEvents = async (req, res, next) => {
  const userId = req.userId;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const events = await Event.aggregate([
      {
        $match: {
          businessId: business?._id,
        },
      },
      {
        $lookup: {
          from: "guests", // Replace with the actual collection name for guests
          localField: "_id",
          foreignField: "eventId",
          as: "guests",
        },
      },
      {
        $addFields: {
          totalGuests: { $size: "$guests" }, // Count total guests for each event
          totalScannedGuests: {
            $sum: { $cond: [{ $eq: ["$guests.isPresent", false] }, 1, 0] },
          }, // Count scanned guests for each event
        },
      },
      {
        $project: {
          guests: 0, // Exclude the guests array from the final result
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    res.status(200).json({ events });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const getActiveEvents = async (req, res, next) => {
  const userId = req.userId;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const currentDate = new Date();

    const events = await Event.find({
      businessId: business?._id,
      eventStart: { $gte: currentDate },
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
    eventLink,
    eventCurrency,
  } = req.body;

  const eventBanner = req.files?.[0];

  console.log(eventBanner);

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    const myBusiness = await Business.findById(user?.businessId);
    if (!user || !business || !myBusiness) {
      return next(new HttpError("Invalid id", 400));
    }

    if (!myBusiness.stripe?.chargesEnabled) {
      return next(
        new HttpError(
          "Connect your Stripe account in Settings → Finance before creating events.",
          403
        )
      );
    }

    if (!eventBanner) {
      return next(new HttpError("Event banner image is required", 400));
    }

    isImageFile(eventBanner.mimetype, next);

    const uploadedEventBanner = await uploadS3Image(
      eventBanner,
      "event_banners/",
      next
    );

    let eventBannerLink = "";

    if (uploadedEventBanner?.uploadedImagePath && uploadedEventBanner?.status) {
      eventBannerLink = uploadedEventBanner.uploadedImagePath;
    } else {
      return next(
        new HttpError(
          "Could not upload event banner. On Vercel add BLOB_READ_WRITE_TOKEN (Storage → Blob); locally use USE_LOCAL_UPLOAD_FALLBACK=true.",
          500
        )
      );
    }

    const generateEventCode = async () => {
      let uniqueCodeGenerated = false;
      let uniqueCode;

      while (!uniqueCodeGenerated) {
        uniqueCode = generateRandomCode(8);
        const eventWithCode = await Event.findOne({ code: uniqueCode });
        if (!eventWithCode) {
          uniqueCodeGenerated = true;
        }
      }
      return uniqueCode;
    };

    const newEvent = new Event({
      eventName,
      eventStart: new Date(eventStart),
      eventEnd: new Date(eventEnd),
      eventType,
      eventCurrency,
      eventBanner: eventBannerLink,
      eventCategory,
      eventAddress: {
        ...(addressDescription && { addressDescription }),
        ...(city && { city }),
        ...(postalCode && { postalCode }),
        ...(country && { country }),
        ...(eventLink && { eventLink }),
      },
      ...(eventCoordinatesX && { eventCoordinatesX }),
      ...(eventCoordinatesY && { eventCoordinatesY }),
      eventVenue,
      eventDescription,
      businessId: myBusiness._id,
      eventCode: await generateEventCode(),
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
    console.error("createNewEvent error:", error);
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
    eventLink,
    eventCurrency,
  } = req.body;

  const [eventBanner] = req.files;

  console.log(req.files);

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    let eventBannerLink = null;

    if (
      req.files?.length > 0 &&
      eventBanner &&
      eventBanner.mimetype.startsWith("image/")
    ) {
      const uploadedEventBanner = await uploadS3Image(
        eventBanner,
        "event_banners/",
        next
      );
      if (uploadedEventBanner?.uploadedImagePath && uploadedEventBanner?.status) {
        eventBannerLink = uploadedEventBanner.uploadedImagePath;
      }
    }

    const updatedEvent = {
      eventName,
      ...(eventStart && { eventStart: new Date(eventStart) }),
      ...(eventEnd && { eventEnd: new Date(eventEnd) }),
      eventType,
      ...(eventBannerLink && { eventBanner: eventBannerLink }),
      eventCategory,
      eventAddress: {
        ...(addressDescription && { addressDescription }),
        ...(city && { city }),
        ...(postalCode && { postalCode }),
        ...(country && { country }),
        ...(eventLink && { eventLink }),
      },
      ...(eventCoordinatesX && { eventCoordinatesX }),
      ...(eventCoordinatesY && { eventCoordinatesY }),
      eventVenue,
      eventDescription,
      eventCurrency,
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

export const getAllEventsForCustomer = async (req, res, next) => {
  const currentDate = new Date();

  try {
    const eventsWithTickets = await Event.aggregate([
      {
        $match: {
          eventEnd: { $gte: currentDate },
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
    ]);

    return res.status(200).json({ events: eventsWithTickets });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const getSingleEventForCustomer = async (req, res, next) => {
  const { eventId } = req.params;
  try {
    let event;
    if (eventId !== "null" && eventId && eventId !== "undefined") {
      event = await Event.findById(eventId).populate("businessId");
    } else {
      return next(new HttpError("Invalid event id ", 400));
    }

    res.status(200).json({ event });
  } catch (error) {
    return next(ServerError(error));
  }
};
