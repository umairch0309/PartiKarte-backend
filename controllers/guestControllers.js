import { findBusinessAndUser } from "../DAL/common.js";
import Guest from "../models/guest.js";
import { SendGuestAddition } from "../helpers/sendEmail.js";
import Event from "../models/event.js";
import HttpError from "../helpers/HttpError.js";

// Create a new guest
export const createGuest = async (req, res) => {
  const { userId } = req;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const newGuest = new Guest({
      ...req.body,
      businessId: business?._id,
      addedBy: userId,
    });
    await newGuest.save();

    const event = await Event.findById(req.body.eventId);

    await SendGuestAddition({
      email: req.body.email,
      event: event?.eventName,
      company: business?.company?.companyName,
    });

    return res.status(201).json({ message: "Guest added successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create guest." });
  }
};

// Creating Multiple Guests
export const createMultipleGuests = async (req, res, next) => {
  const { userId } = req;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const { guests, eventId } = req.body;

    // Validate if eventId exists and is valid
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new HttpError("Invalid eventId", 400));
    }

    const guestsToSave = guests.map((guest) => ({
      ...guest,
      eventId: event?._id,
      businessId: business._id,
      addedBy: userId,
      isNotified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await Guest.insertMany(guestsToSave);

    await SendGuestAddition({
      email: guestsToSave.map((guest) => guest.email),
      event: event?.eventName,
      company: business?.company?.companyName,
    });
    return res.status(201).json({ message: "Guests added successfully" });
  } catch (error) {
    console.log(error, "error creating multiple guests");
    return res.status(500).json({ message: "Failed to create guests." });
  }
};

// Get all guests
export const getAllGuests = async (req, res) => {
  const { userId } = req;

  const { user, business } = await findBusinessAndUser({ _id: userId });
  if (!user || !business) {
    return next(new HttpError("Invalid id", 400));
  }

  const { eventId } = req.params;
  try {
    if (eventId && eventId !== "undefined") {
      const guests = await Guest.find({ eventId, businessId: business?._id })
        .populate("addedBy", "role _id email username")
        .sort({ _id: -1 });
      return res.status(200).json({ guests });
    }
    return res.status(404).json({ message: "Not found" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch guests." });
  }
};

// Get guests summary by event
export const getGuestsSummaryByEvent = async (req, res, next) => {
  const { userId } = req;

  const { user, business } = await findBusinessAndUser({ _id: userId });
  if (!user || !business) {
    return next(new HttpError("Invalid id", 400));
  }

  const { eventId } = req.params;

  try {
    if (eventId && eventId !== "undefined") {
      const guests = await Guest.find({
        eventId,
        businessId: business?._id,
      });

      const guestTypeSummary = guests.reduce((summary, guest) => {
        const { guestType, isPresent } = guest;
        summary[guestType] = summary[guestType] || {
          totalGuests: 0,
          totalPresentGuests: 0,
        };
        summary[guestType].totalGuests += 1;
        summary[guestType].totalPresentGuests += isPresent ? 1 : 0;
        return summary;
      }, {});

      const resultArray = Object.entries(guestTypeSummary).map(
        ([guestType, stats]) => ({
          guestType,
          totalGuests: stats.totalGuests,
          totalPresentGuests: stats.totalPresentGuests,
        })
      );

      return res.status(200).json({ guestTypeSummary: resultArray });
    }

    return res.status(404).json({ message: "Not found" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch guests." });
  }
};

// Get a guest by ID
export const getGuestById = async (req, res) => {
  const { id } = req.params;
  try {
    const { userId } = req;

    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const guest = await Guest.find({ _id: id, businessId: business?._id });
    if (!guest) {
      return res.status(404).json({ error: "Guest not found." });
    }
    return res.status(200).json({ guest });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch guest." });
  }
};

// Update a guest by ID
export const updateGuest = async (req, res) => {
  const { id } = req.params;
  try {
    const { userId } = req;

    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const updatedGuest = await Guest.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedGuest) {
      return res.status(404).json({ error: "Guest not found." });
    }
    return res
      .status(200)
      .json({ message: "Guest updated successfully.", updatedGuest });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update guest." });
  }
};

// Delete a guest by ID
export const deleteGuest = async (req, res) => {
  const { id } = req.params;
  try {
    const { userId } = req;

    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const deletedGuest = await Guest.findByIdAndRemove(id);
    if (!deletedGuest) {
      return res.status(404).json({ error: "Guest not found." });
    }
    return res.status(200).json({ message: "Guest deleted successfully." });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete guest." });
  }
};
