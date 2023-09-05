import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";

const contactSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
    required: true,
  },
  lastName: {
    type: String,
    trim: true,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    required: true,
  },
  subject: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    required: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
  },
  files: [
    {
      type: String,
      trim: true,
    },
  ],
});

contactSchema.plugin(timestamps);

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;
