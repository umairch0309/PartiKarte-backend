import express from "express";
import verifyAdminToken from "../middlewares/verifyAdminToken.js";

import {
  register,
  authenticate,
  updatePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  profileDetails,
  changeProfileDetails,
} from "../controllers/adminControllers.js";

import {
  getAllEvents,
  getActiveEvents,
  getEvent,
  deleteEvent,
} from "../controllers/admin/events.js";
import {
  getAllBusinesses,
  getSingleBusinesses,
} from "../controllers/admin/businesses.js";
import {
  getAllOrdersByBusiness,
  getBusinessRevenueByMonth,
  getLatestOrders,
  getOrdersByTimeInterval,
} from "../controllers/admin/orders.js";

const mainRouter = express.Router();

// AUTH ROUTES
const AuthRouter = express.Router();
AuthRouter.post("/register", register);
AuthRouter.post("/login", authenticate);
AuthRouter.put("/change-password", verifyAdminToken, updatePassword);
AuthRouter.post("/forgot-password", forgotPassword);
AuthRouter.post("/verify-otp", verifyOtp);
AuthRouter.post("/reset-password", resetPassword);
AuthRouter.get("/get-profile", verifyAdminToken, profileDetails);
AuthRouter.put("/update-profile", verifyAdminToken, changeProfileDetails);

// BUSINESS ROUTES
const BusinessRouter = express.Router();
BusinessRouter.get("/businesses", getAllBusinesses);
BusinessRouter.get("/business/:businessId", getSingleBusinesses);

// EVENTS ROUTES
const EventsRouter = express.Router();
EventsRouter.get("/events", verifyAdminToken, getAllEvents);
EventsRouter.get("/events/active", verifyAdminToken, getActiveEvents);
EventsRouter.get("/events/:eventId", verifyAdminToken, getEvent);
EventsRouter.delete("/events/delete/:id", verifyAdminToken, deleteEvent);

// ORDERS ROUTES
const OrdersRouter = express.Router();
OrdersRouter.get("/orders/latest-orders", verifyAdminToken, getLatestOrders);
OrdersRouter.get(
  "/orders/:businessId",
  verifyAdminToken,
  getAllOrdersByBusiness
);
OrdersRouter.get(
  "/orders/by-time/:interval",
  verifyAdminToken,
  getOrdersByTimeInterval
);
OrdersRouter.get(
  "/orders/get-business-revenue-by-month/:month",
  verifyAdminToken,
  getBusinessRevenueByMonth
);

// Sub Routes -> Main Route
mainRouter.use("/auth", AuthRouter);
mainRouter.use("/", EventsRouter);
mainRouter.use("/", BusinessRouter);
mainRouter.use("/", OrdersRouter);

export { mainRouter as admin };
