import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import timestamps from "mongoose-timestamp";

const adminRoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
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

adminRoleSchema.plugin(uniqueValidator);
adminRoleSchema.plugin(timestamps);

const AdminRole = mongoose.model("AdminRole", adminRoleSchema);

export default AdminRole;
