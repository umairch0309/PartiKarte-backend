import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";

const notificationSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Types.ObjectId,
    ref: "Business",
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: [
      "order",
      "ticket",
      "refund",
      "payout",
      "stripe",
      "system",
    ],
    default: "system",
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  orderId: {
    type: mongoose.Types.ObjectId,
    ref: "Order",
  },
  eventId: {
    type: mongoose.Types.ObjectId,
    ref: "Event",
  },
  link: {
    type: String,
    trim: true,
  },
  meta: {
    type: Object,
    default: {},
  },
});

notificationSchema.plugin(timestamps);

notificationSchema.index({ businessId: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
