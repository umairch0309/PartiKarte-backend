import dotenv from "dotenv";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import Admin from "../models/admin.js";
import Business from "../models/business.js";
import User from "../models/user.js";

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
    req.adminId = decoded._id;

    try {
      const businessUser = await User.findOne({
        businessId: req?.query?.businessId,
      });

      req.userId = businessUser?._id;
    } catch (err) {}

    const user = await Admin.findById(req.adminId);
    if (!user) return res.status(401).json({ error: "Invalid user token" });

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export default verifyAdminToken;
