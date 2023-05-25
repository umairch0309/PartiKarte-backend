import mongoose from "mongoose";

const codeSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User"
  },
  tickets: {
    type: [{
      ticketName: {
        type: String,
        required: false
      },
      ticketId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: "User"
      },
      codes: {
        type: [mongoose.Schema.Types.ObjectId],
        default: []
      }
    }],
    default: []
  }
}, { collection: 'codes' });

const Codes = mongoose.model('Codes', codeSchema);

export default Codes;