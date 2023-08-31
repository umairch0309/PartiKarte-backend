import express from "express";
import verifyToken from "../middlewares/verifyToken.js";

import {
  register,
  authenticate,
  updatePassword,
  profileDetails,
  forgotPassword,
  verifyOtp,
  resetPassword,
} from "../controllers/authControllers.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", authenticate);

router.put("/change-password", verifyToken, updatePassword);

router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

router.get("/get-profile", verifyToken, profileDetails);

export { router as auth };
