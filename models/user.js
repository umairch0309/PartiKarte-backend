import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
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

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    surname: {
      type: String,
      trim: true,
    },
    dob: {
      type: Date,
    },
    profile_image: {
      type: String,
    },
    address: addressSchema,
    IDFront: {
      type: String,
    },

    IDBack: {
      type: String,
    },
    role: {
      type: String,
      required: true,
    },
    guestType: {
      type: String,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    urlSlug: {
      type: String,
      unique: true,
      trim: true,
    },
    isVerified: {
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
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { collection: "users" }
);

userSchema.plugin(uniqueValidator);
userSchema.plugin(timestamps);

const User = mongoose.model("User", userSchema);

export default User;
