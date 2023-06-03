import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

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
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
  },
});

newsSchema.plugin(uniqueValidator);

const News = mongoose.model("News", newsSchema);

export default News;
