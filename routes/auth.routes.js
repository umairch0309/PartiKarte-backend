import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { upload } from "../helpers/multerConfig.js";

import { register, authenticate } from "../controllers/authControllers.js";

dotenv.config();

const router = express.Router();
router.use(bodyParser.json());

router.post("/register", register);
router.post("/authentication", authenticate);

// // reset password to be placed here
// router.post("/reset-password", verifyToken, requestResetPassword);
// router.post("/reset-password/:token", resetPassword);

// // update business user apis starting from here
// router.put("/change-password", verifyToken, updatePassword);
// router.put("/change-email", verifyToken, updateEmail);

export { router as auth };
