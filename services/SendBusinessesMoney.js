import Business from "../models/business.js";
import Transaction from "../models/transaction.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Legacy internal ledger reset. Real payouts are handled by Stripe Connect
 * to each business's connected account. Kept only for optional reporting rows.
 */
const SendBusinessesMoney = async () => {
  try {
    const businesses = await Business.find();

    for (const business of businesses) {
      const balance = business?.earnings?.currentBalance || 0;
      if (balance <= 0) continue;

      const newTransaction = new Transaction({
        txnId: uuidv4(),
        amount: balance,
        accountNo:
          business?.stripe?.accountId ||
          business?.financialInformation?.IBAN,
        accountName: business?.financialInformation?.accountName,
        businessId: business._id,
      });

      await newTransaction.save();

      business.earnings.currentBalance = 0;
      await business.save();
    }

    console.log("Monthly ledger transactions created successfully.");
  } catch (error) {
    console.error("Error creating monthly transactions:", error);
  }
};

export default SendBusinessesMoney;
