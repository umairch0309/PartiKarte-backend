import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import timestamps from "mongoose-timestamp";

const transactionSchema = new mongoose.Schema({
  txnId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  accountNo: {
    type: String,
  },
  accountName: {
    type: String,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
  },
});

transactionSchema.plugin(uniqueValidator);
transactionSchema.plugin(timestamps);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
