import express from "express";
import verifyToken from "../middlewares/verifyToken.js";

import {
  createFreeOrder,
  createBankPaymentOrder,
  createCardPaymentOrder,
  apiPaymentCallback,
  getLatestOrders,
  getOrdersByTimeInterval,
  getAllOrdersByEvent,
  getBusinessRevenueByMonth,
} from "../controllers/orderControllers.js";

const router = express.Router();

router.post("/create-free-order", createFreeOrder);
router.post("/create-bank-payment-order", createBankPaymentOrder);
router.post("/create-card-payment-order", createCardPaymentOrder);
router.post("/result-api-callback", apiPaymentCallback);

// admin side orders apis
router.get("/orders/latest-orders", verifyToken, getLatestOrders);
router.get("/orders/:eventId", verifyToken, getAllOrdersByEvent);
router.get("/orders/by-time/:interval", verifyToken, getOrdersByTimeInterval);
router.get(
  "/orders/get-business-revenue-by-month/:month",
  verifyToken,
  getBusinessRevenueByMonth
);

export { router as orders };
