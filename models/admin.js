import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import timestamps from "mongoose-timestamp";

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    permissions: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminRole",
    },
    profile_image: {
      type: String,
    },
    role: {
      type: String,
      required: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verifyEmailRequested: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    otp: { type: String },
    otpExpiry: { type: Date },
  },
  { collection: "admins" }
);

adminSchema.plugin(uniqueValidator);
adminSchema.plugin(timestamps);

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
