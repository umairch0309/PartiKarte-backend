import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import { getAllBusinessTransctions } from "../controllers/transactionControllers.js";

const router = express.Router();

router.get("/all", verifyToken, getAllBusinessTransctions);

export { router as transactions };
