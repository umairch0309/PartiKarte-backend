import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const newsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
  },
  images: [{ type: String }],
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
});

newsSchema.plugin(uniqueValidator);

const News = mongoose.model("News", newsSchema);

export default News;
