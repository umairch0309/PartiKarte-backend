import { findBusinessAndUser } from "../DAL/common.js";
import Guest from "../models/guest.js";

// Create a new guest
export const createGuest = async (req, res) => {
  const { userId } = req;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const newGuest = new Guest({ ...req.body, businessId: business?._id });
    await newGuest.save();
    return res.status(201).json({ message: "Guest added successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create guest." });
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
        .populate("addedBy")
        .sort({ _id: -1 });
      return res.status(200).json({ guests });
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
