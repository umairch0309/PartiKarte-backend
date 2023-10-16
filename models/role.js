import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import timestamps from "mongoose-timestamp";

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  businessId: {
    type: mongoose.Types.ObjectId,
    ref: "Business",
  },
  permissions: [
    {
      name: {
        type: String,
        required: true,
      },
      identifier: {
        type: String,
        required: true,
      },
      isGranted: {
        type: Boolean,
        default: false,
      },
      sub: [
        {
          name: {
            type: String,
            required: true,
          },
          identifier: {
            type: String,
            required: true,
          },
          isGranted: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
  ],
});

roleSchema.plugin(uniqueValidator);
roleSchema.plugin(timestamps);

const Role = mongoose.model("Role", roleSchema);

export default Role;
