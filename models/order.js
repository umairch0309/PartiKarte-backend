import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";

const addressSchema = new mongoose.Schema({
  addressDescription: {
    type: String,
    trim: true,
  },
  eventLink: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  postalCode: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
});

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Types.ObjectId,
  },
  noOfTickets: {
    type: Number,
  },
});

const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    trim: true,
  },
  customerSurname: {
    type: String,
  },
  customerEmail: {
    type: String,
    required: true,
  },
  customerPhoneNumber: {
    type: String,
  },
  orderAmount: {
    type: Number,
    required: true,
  },
  customerAddress: addressSchema,
  noOfTickets: {
    type: Number,
    required: true,
  },
  tickets: [ticketSchema],
  recommendations: {
    type: Boolean,
    default: false,
  },
  eventId: {
    type: mongoose.Types.ObjectId,
    ref: "Event",
  },
});

orderSchema.plugin(timestamps);

const Order = mongoose.model("Order", orderSchema);

export default Order;
