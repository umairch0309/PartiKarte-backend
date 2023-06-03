import mongoose from "mongoose";

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
  },
  dateStart: {
    type: Date,
  },
  dateEnd: {
    type: Date,
  },
  maxCapacity: {
    type: Number,
  },
  price: {
    type: Number,
  },
  vatPercentage: {
    type: Number,
  },
  vat: {
    type: Number,
  },
  priceWithVAT: {
    type: Number,
  },
  description: {
    type: String,
  },
  inventory: {
    type: Number,
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
  // eventBanner: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "Image",
  //   required: true,
  // },
  eventBanner: {
    type: String,
    required: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
  },
  tickets: [ticketSchema],
});

const Event = mongoose.model("Event", eventSchema);

export default Event;
