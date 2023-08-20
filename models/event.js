import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";

const addressSchema = new mongoose.Schema({
  addressDescription: {
    type: String,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  postalCode: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
});

const ticketSchema = new mongoose.Schema({
  ticketName: {
    type: String,
    trim: true,
    required: true,
  },
  validFrom: {
    type: Date,
    required: true,
  },
  validTo: {
    type: Date,
    required: true,
  },
  maxCapacity: {
    type: Number,
    required: true,
  },
  paymentType: {
    type: String,
    enum: ["paid", "free"],
    required: true,
  },
  capacityLimitation: {
    type: String,
    enum: ["limited", "unlimited"],
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  vatPercentage: {
    type: Number,
    required: true,
  },
  vat: {
    type: Number,
    required: true,
  },
  priceWithVAT: {
    type: Number,
    required: true,
  },
  descriptionWeb: {
    type: String,
    required: true,
  },
  descriptionTicket: {
    type: String,
    required: true,
  },
  ticketOrders: {
    type: Number,
    default: 0,
  },
  revenue: {
    type: Number,
    default: 0,
  },
});

const eventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true,
    trim: true,
  },
  eventCategory: {
    type: String,
    required: true,
  },
  eventType: {
    type: String,
    required: true,
  },
  eventStart: {
    type: Date,
    required: true,
  },
  eventEnd: {
    type: Date,
    required: true,
  },
  eventAddress: addressSchema,
  eventCoordinatesX: {
    type: String,
  },
  eventCoordinatesY: {
    type: String,
  },
  eventVenue: {
    type: String,
    required: true,
  },
  eventDescription: {
    type: String,
  },
  eventBanner: {
    type: String,
    required: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  ticketsSold: {
    type: Number,
    default: 0,
  },
  revenue: {
    type: Number,
    default: 0,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
  },
  tickets: [ticketSchema],
  news: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "News",
    },
  ],
});

eventSchema.plugin(timestamps);
ticketSchema.plugin(timestamps);

const Event = mongoose.model("Event", eventSchema);

export default Event;
