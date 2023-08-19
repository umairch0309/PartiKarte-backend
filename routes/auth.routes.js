import express from "express";
import verifyToken from "../middlewares/verifyToken.js";

import {
  register,
  authenticate,
  updatePassword,
  requestResetPassword,
  resetPassword,
  profileDetails,
} from "../controllers/authControllers.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", authenticate);

router.put("/change-password", verifyToken, updatePassword);

// // reset password to be placed here
router.post("/reset-password", requestResetPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/get-profile", verifyToken, profileDetails);

export { router as auth };
