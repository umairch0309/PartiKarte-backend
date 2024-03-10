import { findBusinessAndUser } from "../DAL/common.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import Transaction from "../models/transaction.js";

export const getAllBusinessTransctions = async (req, res, next) => {
  const userId = req.userId;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const existingTransactions = await Transaction.find({
      businessId: business?._id,
    });
    if (!existingTransactions) {
      return next(new HttpError("Couldn't find transactions", 404));
    }

    res
      .status(200)
      .send({ message: "Transactions!", transactions: existingTransactions });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const getAllTransctions = async (req, res, next) => {
  try {
    const existingTransactions = await Transaction.find({}).populate(
      "businessId",
      "company _id contactInformation"
    );
    if (!existingTransactions) {
      return next(new HttpError("Couldn't find transactions", 404));
    }

    res
      .status(200)
      .send({ message: "Transactions!", transactions: existingTransactions });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};
