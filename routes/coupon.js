import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import {
  createCoupon,
  updateCoupon,
  expireCoupon,
  activateCoupon,
  getCoupon,
  validateCoupon,
} from "../controllers/couponControllers.js";

const router = express.Router();

router.get("/coupon/:eventId", verifyToken, getCoupon);

router.post("/coupon/create/:eventId", verifyToken, createCoupon);

router.put("/coupon/update/:eventId/:id", verifyToken, updateCoupon);

router.put("/coupon/expire/:eventId/:id", verifyToken, expireCoupon);

router.put("/coupon/activate/:eventId/:id", verifyToken, activateCoupon);

router.post("/coupon/validate", validateCoupon);

export { router as coupons };
