import express from "express";
import verifyToken from "../middlewares/verifyToken.js";

import {
  createFreeOrder,
  createBankPaymentOrder,
  getLatestOrders,
  getOrdersByTimeInterval,
  getAllOrdersByEvent,
  getBusinessRevenueByMonth,
  getBusinessFinanceSummary,
} from "../controllers/orderControllers.js";

const router = express.Router();

router.post("/create-free-order", createFreeOrder);
router.post("/create-bank-payment-order", createBankPaymentOrder);

router.get("/orders/latest-orders", verifyToken, getLatestOrders);
router.get(
  "/orders/finance-summary",
  verifyToken,
  getBusinessFinanceSummary
);
router.get(
  "/orders/get-business-revenue-by-month/:month",
  verifyToken,
  getBusinessRevenueByMonth
);
router.get("/orders/by-time/:interval", verifyToken, getOrdersByTimeInterval);
router.get("/orders/:eventId", verifyToken, getAllOrdersByEvent);

export { router as orders };
