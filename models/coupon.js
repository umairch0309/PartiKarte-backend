import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import timestamps from "mongoose-timestamp";

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isExpired: {
    type: mongoose.Schema.Types.Boolean,
    default: false,
  },
});

couponSchema.plugin(uniqueValidator);
couponSchema.plugin(timestamps);

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
