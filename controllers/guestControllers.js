import Guest from "../models/guest.js";

// Create a new guest
export const createGuest = async (req, res) => {
  const { userId } = req;

  try {
    const newGuest = new Guest({ ...req.body, addedBy: userId });
    await newGuest.save();
    return res.status(201).json({ message: "Guest added successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create guest." });
  }
};

// Get all guests
export const getAllGuests = async (req, res) => {
  const { eventId } = req.params;
  try {
    if (eventId && eventId !== "undefined") {
      const guests = await Guest.find({ eventId })
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
    const guest = await Guest.findById(id);
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
    const deletedGuest = await Guest.findByIdAndRemove(id);
    if (!deletedGuest) {
      return res.status(404).json({ error: "Guest not found." });
    }
    return res.status(204).json({ message: "Guest deleted successfully." }); // No content
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete guest." });
  }
};
