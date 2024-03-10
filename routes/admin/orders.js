import express from "express";

import {
  createFreeOrder,
  createBankPaymentOrder,
  createCardPaymentOrder,
  apiPaymentCallback,
  getLatestOrders,
  getOrdersByTimeInterval,
  getAllOrdersByEvent,
  getBusinessRevenueByMonth,
} from "../../controllers/orderControllers.js";
import verifyAdminToken from "../../middlewares/verifyAdminToken.js";

const router = express.Router();

router.post("/create-free-order", createFreeOrder);
router.post("/create-bank-payment-order", createBankPaymentOrder);
router.post("/create-card-payment-order", createCardPaymentOrder);
router.post("/result-api-callback", apiPaymentCallback);

router.get("/orders/latest-orders", verifyAdminToken, getLatestOrders);
router.get("/orders/:eventId", verifyAdminToken, getAllOrdersByEvent);
router.get(
  "/orders/by-time/:interval",
  verifyAdminToken,
  getOrdersByTimeInterval
);
router.get(
  "/orders/get-business-revenue-by-month/:month",
  verifyAdminToken,
  getBusinessRevenueByMonth
);

export { router as orders };
