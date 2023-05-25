import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    trim: true,
  },
  streetNumber: {
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
  businessUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "businessUser",
  },
});

const ownerSchema = new mongoose.Schema({
  ownerName: {
    type: String,
    trim: true,
  },
  ownerSurname: {
    type: String,
    trim: true,
  },
  ownerDOB: {
    type: Date,
  },
  ownerAddress: addressSchema,
  ownerIDFront: {
    type: String,
  },
  ownerIDBack: {
    type: String,
  },
});

const managerSchema = new mongoose.Schema({
  managerName: {
    type: String,
    trim: true,
  },
  managerSurname: {
    type: String,
    trim: true,
  },
  managerDOB: {
    type: Date,
  },
  managerAddress: addressSchema,
  managerIDFront: {
    type: String,
  },
  managerIDBack: {
    type: String,
  },
  managerTitle: {
    type: String,
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
    trim: true,
  },
  urlSlug: {
    type: String,
    trim: true,
  },
  eventStart: {
    type: Date,
  },
  eventEnd: {
    type: Date,
  },
  eventAddress: {
    type: String,
    trim: true,
  },
  eventCoordinatesX: {
    type: String,
  },
  eventCoordinatesY: {
    type: String,
  },
  eventVenue: {
    type: String,
  },
  eventDescription: {
    type: String,
  },
  eventBanner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image",
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
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
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
    password: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
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
    owners: [ownerSchema],
    managers: [managerSchema],
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

    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { collection: "businessUsers" }
);

businessUserSchema.plugin(uniqueValidator);

const businessUser = mongoose.model("businessUser", businessUserSchema);

export default businessUser;
