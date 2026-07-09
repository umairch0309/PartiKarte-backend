import connectDB from "../../config/db.js";
import SendBusinessesMoney from "../../services/SendBusinessesMoney.js";

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await connectDB();
    await SendBusinessesMoney();
    return res.status(200).json({ message: "Monthly transactions created successfully." });
  } catch (error) {
    console.error("Cron job failed:", error);
    return res.status(500).json({ message: error.message });
  }
}
