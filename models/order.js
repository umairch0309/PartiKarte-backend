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
  scannedTickets: [
    {
      id: { type: Number },
      scannedAt: { type: Date },
      scannedBy: {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
    },
  ],
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
  platformFeeAmount: {
    type: Number,
    default: 0,
  },
  netToBusiness: {
    type: Number,
    default: 0,
  },
  stripePaymentIntentId: {
    type: String,
    trim: true,
  },
  stripeCheckoutSessionId: {
    type: String,
    trim: true,
  },
  stripeCustomerId: {
    type: String,
    trim: true,
  },
  stripeInvoiceId: {
    type: String,
    trim: true,
  },
  currency: {
    type: String,
    trim: true,
    default: "EUR",
  },
  refundedApplicationFee: {
    type: Boolean,
    default: false,
  },
  refundStatus: {
    type: String,
    enum: ["none", "partial", "full"],
    default: "none",
  },
  refundedAmount: {
    type: Number,
    default: 0,
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
  couponId: {
    type: mongoose.Types.ObjectId,
    ref: "Coupon",
  },
  couponCode: {
    type: String,
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
