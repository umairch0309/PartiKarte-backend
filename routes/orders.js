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
  getOrderDetailsById,
  refundOrderPayment,
  resendTicketsToCustomer,
} from "../controllers/orderControllers.js";

const router = express.Router();

router.post("/create-free-order", createFreeOrder);
router.post("/create-bank-payment-order", createBankPaymentOrder);
router.post("/create-card-payment-order", createCardPaymentOrder);
router.post("/result-api-callback", apiPaymentCallback);

router.get("/orders/latest-orders", verifyToken, getLatestOrders);
router.get("/orders/:eventId", verifyToken, getAllOrdersByEvent);
router.get("/orders/order-detail/:orderId", verifyToken, getOrderDetailsById);
router.get("/orders/refund-order/:orderId", verifyToken, refundOrderPayment);
router.get(
  "/orders/:orderId/resend-tickets",
  verifyToken,
  resendTicketsToCustomer
);
router.get("/orders/by-time/:interval", verifyToken, getOrdersByTimeInterval);
router.get(
  "/orders/get-business-revenue-by-month/:month",
  verifyToken,
  getBusinessRevenueByMonth
);

export { router as orders };
