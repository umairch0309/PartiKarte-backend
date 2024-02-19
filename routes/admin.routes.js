import express from "express";
import verifyAdminToken from "../middlewares/verifyAdminToken.js";

import {
  register,
  authenticate,
  updatePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  profileDetails,
  changeProfileDetails,
} from "../controllers/adminControllers.js";

const mainRouter = express.Router();

// AUTH ROUTES
const AuthRouter = express.Router();

AuthRouter.post("/register", register);
AuthRouter.post("/login", authenticate);

AuthRouter.put("/change-password", verifyAdminToken, updatePassword);

AuthRouter.post("/forgot-password", forgotPassword);
AuthRouter.post("/verify-otp", verifyOtp);
AuthRouter.post("/reset-password", resetPassword);
AuthRouter.get("/get-profile", verifyAdminToken, profileDetails);
AuthRouter.put("/update-profile", verifyAdminToken, changeProfileDetails);

// Sub Routes -> Main Route
mainRouter.use("/auth", AuthRouter);

export { mainRouter as admin };
