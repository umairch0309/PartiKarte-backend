import dotenv from "dotenv";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import Admin from "../models/admin.js";

dotenv.config();

const verifyAdminToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    req.userId = decoded._id;

    const user = await Admin.findById(req.userId);
    if (!user) return res.status(401).json({ error: "Invalid user token" });

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export default verifyAdminToken;
