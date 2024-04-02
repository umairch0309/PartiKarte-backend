import dotenv from "dotenv";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { findBusinessAndUser } from "../DAL/common.js";

dotenv.config();

const verifyToken = async (req, res, next) => {
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

    const { user, business } = await findBusinessAndUser({ _id: req.userId });
    if (!user || !business || business?.isBlocked) {
      return res.status(401).json({ error: "You are not authorized!" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export default verifyToken;
