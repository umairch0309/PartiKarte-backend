import express from "express";
import verifyToken from "../middlewares/verifyToken.js";

import { upload } from "../helpers/multerConfig.js";

import {
  register,
  authenticate,
  updatePassword,
  requestResetPassword,
  resetPassword,
} from "../controllers/authControllers.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", authenticate);

router.put("/change-password", verifyToken, updatePassword);

// // reset password to be placed here
router.post("/reset-password", requestResetPassword);
router.post("/reset-password/:token", resetPassword);

export { router as auth };
