import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";

const guestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  surname: {
    type: String,
    required: true,
    trim: true,
  },
  guestType: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  isNotified: {
    type: Boolean,
    required: true,
    default: false,
  },
  addedBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  eventId: {
    type: mongoose.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  businessId: {
    type: mongoose.Types.ObjectId,
    ref: "Business",
    required: true,
  },
});

guestSchema.plugin(timestamps);

const Guest = mongoose.model("Guest", guestSchema);

export default Guest;
