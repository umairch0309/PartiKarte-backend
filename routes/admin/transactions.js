import express from "express";
import {
  getAllBusinessTransctions,
  getAllTransctions,
} from "../../controllers/transactionControllers.js";
import verifyAdminToken from "../../middlewares/verifyAdminToken.js";

const router = express.Router();

router.get("/business/all", verifyAdminToken, getAllBusinessTransctions);

router.get("/all", verifyAdminToken, getAllTransctions);

export { router as transactions };
