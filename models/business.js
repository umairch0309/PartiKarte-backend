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
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  images: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
    },
  ],
});

const newsSchema = new mongoose.Schema({
  header: {
    type: String,
    required: true,
    trim: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "business",
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
  urlSlug: {
    type: String,
    trim: true,
    required: true,
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
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image",
    required: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  tickets: [ticketSchema],
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
    organizerName: {
      type: String,
      required: false,
      unique: true,
      trim: true,
    },
    organizerImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
    },
    urlSlug: {
      type: String,
      unique: true,
      trim: true,
    },
    galleries: [gallerySchema],
    news: [newsSchema],
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
      website: {
        type: String,
        trim: true,
      },
      twitter: {
        type: String,
        trim: true,
      },
      other: {
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
        required: true,
      },
    ],
    events: [eventSchema],
    certificate: certificateSchema,
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

const business = mongoose.model("business", businessUserSchema);

export default business;
