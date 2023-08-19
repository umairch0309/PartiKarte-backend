import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

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

const gallerySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  startingDate: {
    type: Date,
    required: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  images: [
    {
      type: String,
    },
  ],
});

const certificateSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Certificate",
  },
  hashedPassword: {
    type: String,
  },
});

const businessUserSchema = new mongoose.Schema(
  {
    organizerImage: {
      type: String,
    },
    organizerImageBanner: {
      type: String,
    },
    urlSlug: {
      type: String,
      unique: true,
      trim: true,
    },
    galleries: [gallerySchema],
    news: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "News",
      },
    ],
    description: {
      type: String,
      trim: true,
    },
    socialLinks: {
      facebook: {
        type: String,
        trim: true,
      },
      instagram: {
        type: String,
        trim: true,
      },
      linkedin: {
        type: String,
        trim: true,
      },
    },
    company: {
      companyVAT: {
        type: Number,
        unique: true,
        sparse: true,
      },
      companyName: {
        type: String,
        trim: true,
      },
      companyAddress: addressSchema,
      companyRegistryNumber: {
        type: Number,
        unique: true,
        sparse: true,
      },
    },
    businessManagers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    events: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    certificate: [certificateSchema],
    contactInformation: {
      email: {
        type: String,
        trim: true,
      },
      phoneNumber: {
        type: String,
        trim: true,
        required: false,
      },
      website: {
        type: String,
        trim: true,
        required: false,
      },
    },
    financialInformation: {
      IBAN: {
        type: String,
        trim: true,
      },
      accountName: {
        type: String,
        trim: true,
      },
      invoiceEmail: {
        type: String,
        trim: true,
      },
    },
    marketingInformation: {
      metaPixelId: {
        type: String,
        trim: true,
      },
      googleAnalyticsId: {
        type: String,
        trim: true,
      },
      apiAccessKey: {
        type: String,
        trim: true,
      },
    },
  },
  { collection: "businesses" }
);

businessUserSchema.plugin(uniqueValidator);

const Business = mongoose.model("Business", businessUserSchema);

export default Business;
