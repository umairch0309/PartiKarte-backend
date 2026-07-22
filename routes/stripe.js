import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import {
  createAccountLink,
  createConnectAccount,
  createStripeCheckoutSession,
  getConnectStatus,
  refundOrder,
} from "../controllers/stripeControllers.js";

const router = express.Router();

router.post("/connect/create-account", verifyToken, createConnectAccount);
router.post("/connect/account-link", verifyToken, createAccountLink);
router.get("/connect/status", verifyToken, getConnectStatus);

router.post("/create-checkout-session", createStripeCheckoutSession);
router.post("/refund/:orderId", verifyToken, refundOrder);

export { router as stripeRoutes };
