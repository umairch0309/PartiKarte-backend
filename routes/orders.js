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
} from "../controllers/orderControllers.js";

const router = express.Router();

router.post("/create-free-order", createFreeOrder);
router.post("/create-bank-payment-order", createBankPaymentOrder);
router.post("/create-card-payment-order", createCardPaymentOrder);
router.post("/result-api-callback", apiPaymentCallback);

// admin side orders apis
router.get("/orders/latest-orders", getLatestOrders);
router.get("/orders/:eventId", getAllOrdersByEvent);
router.get("/orders/by-time/:interval", getOrdersByTimeInterval);

export { router as orders };
