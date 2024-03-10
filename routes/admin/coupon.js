import express from "express";
import {
  createCoupon,
  updateCoupon,
  expireCoupon,
  activateCoupon,
  getCoupon,
  validateCoupon,
} from "../../controllers/couponControllers.js";
import verifyAdminToken from "../../middlewares/verifyAdminToken.js";

const router = express.Router();

router.get("/coupon/:eventId", verifyAdminToken, getCoupon);

router.post("/coupon/create/:eventId", verifyAdminToken, createCoupon);

router.put("/coupon/update/:eventId/:id", verifyAdminToken, updateCoupon);

router.put("/coupon/expire/:eventId/:id", verifyAdminToken, expireCoupon);

router.put("/coupon/activate/:eventId/:id", verifyAdminToken, activateCoupon);

router.post("/coupon/validate", validateCoupon);

export { router as coupons };
