import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";

const addressSchema = new mongoose.Schema({
  addressDescription: {
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
  scannedTickets: {
    type: Number,
    default: 0,
  },
  allQuestions: [
    {
      questions: [
        {
          label: {
            type: String,
          },
          answer: {
            type: String,
          },
        },
      ],
    },
  ],
});

const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    trim: true,
  },
  customerEmail: {
    type: String,
    required: true,
  },
  customerPhoneNumber: {
    type: String,
  },
  purchaseId: {
    type: String,
    default: "not-a-card-payment",
  },
  bankUuid: {
    type: String,
    default: "not-a-card-payment",
  },
  orderAmount: {
    type: Number,
    required: true,
  },
  paymentStatus: {
    type: Boolean,
    default: false,
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
    required: true,
  },
  businessId: {
    type: mongoose.Types.ObjectId,
    ref: "Business",
    required: true,
  },
  automatedMailSent: {
    type: Boolean,
    default: false,
  },
});

orderSchema.plugin(timestamps);

const Order = mongoose.model("Order", orderSchema);

export default Order;
