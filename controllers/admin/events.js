import { preprocessImage, isImageFile } from "../../helpers/helpers.js";
import HttpError, { ServerError } from "../../helpers/HttpError.js";
import { findBusinessAndUser } from "../../DAL/common.js";
import Event from "../../models/event.js";
import Business from "../../models/business.js";
import uploadS3Image from "../../utils/uploadS3Image.js";

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
  try {
    const events = await Event.aggregate([
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
  try {
    const currentDate = new Date();

    const events = await Event.find({
      eventStart: { $gte: currentDate },
    });

    res.status(200).json({ events });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const getEvent = async (req, res, next) => {
  const { eventId } = req.params;

  try {
    const event = await Event.findById(eventId);

    res.status(200).json({ event });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const deleteEvent = async (req, res, next) => {
  const eventId = req.params.id;

  try {
    const deletedEvent = await Event.findByIdAndDelete(eventId);

    if (!deletedEvent) {
      return next(new HttpError("Invalid event id", 400));
    }

    const myBusiness = await Business.findById(deletedEvent.businessId);
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
