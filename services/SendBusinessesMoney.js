import Business from "../models/business.js";
import Transaction from "../models/transaction.js";
import { v4 as uuidv4 } from "uuid";

const SendBusinessesMoney = async () => {
  try {
    const businesses = await Business.find();

    for (const business of businesses) {
      const newTransaction = new Transaction({
        txnId: uuidv4(),
        amount: business?.earnings?.currentBalance,
        accountNo: business?.financialInformation?.IBAN,
        accountName: business?.financialInformation?.accountName,
        businessId: business._id,
      });

      await newTransaction.save();

      business.earnings.currentBalance = 0;
      await business.save();
    }

    console.log("Monthly transactions created successfully.");
  } catch (error) {
    console.error("Error creating monthly transactions:", error);
  }
};

export default SendBusinessesMoney;
