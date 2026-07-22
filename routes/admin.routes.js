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
  getAllAdmins,
  updateAdmin,
  deleteAdmin,
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
  getPlatformFinanceSummary,
} from "../controllers/admin/orders.js";
import {
  getAllAdminRoles,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
} from "../controllers/admin/roles.js";

const mainRouter = express.Router();

// AUTH ROUTES
const AuthRouter = express.Router();
AuthRouter.post("/register", verifyAdminToken, register);
AuthRouter.post("/login", authenticate);
AuthRouter.put("/change-password", verifyAdminToken, updatePassword);
AuthRouter.post("/forgot-password", forgotPassword);
AuthRouter.post("/verify-otp", verifyOtp);
AuthRouter.post("/reset-password", resetPassword);
AuthRouter.get("/get-profile", verifyAdminToken, profileDetails);
AuthRouter.put("/update-profile", verifyAdminToken, changeProfileDetails);
AuthRouter.get("/get-all-admins", verifyAdminToken, getAllAdmins);
AuthRouter.put("/update-admin/:adminId", verifyAdminToken, updateAdmin);
AuthRouter.delete("/delete-admin/:adminId", verifyAdminToken, deleteAdmin);

// BUSINESS ROUTES
const BusinessRouter = express.Router();
BusinessRouter.get("/businesses", verifyAdminToken, getAllBusinesses);
BusinessRouter.get(
  "/business/:businessId",
  verifyAdminToken,
  getSingleBusinesses
);

// EVENTS ROUTES
const EventsRouter = express.Router();
EventsRouter.get("/events", verifyAdminToken, getAllEvents);
EventsRouter.get("/events/active", verifyAdminToken, getActiveEvents);
EventsRouter.get("/events/:eventId", verifyAdminToken, getEvent);
EventsRouter.delete("/events/delete/:id", verifyAdminToken, deleteEvent);

// ROLES ROUTES
const RolesRouter = express.Router();
RolesRouter.get("/roles", verifyAdminToken, getAllAdminRoles);
RolesRouter.post("/roles/create-role", verifyAdminToken, createAdminRole);
RolesRouter.put(
  "/roles/update-role/:roleId",
  verifyAdminToken,
  updateAdminRole
);
RolesRouter.delete(
  "/roles/delete-role/:roleId",
  verifyAdminToken,
  deleteAdminRole
);

// ORDERS ROUTES (static paths before :businessId)
const OrdersRouter = express.Router();
OrdersRouter.get("/orders/latest-orders", verifyAdminToken, getLatestOrders);
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
OrdersRouter.get(
  "/orders/finance-summary",
  verifyAdminToken,
  getPlatformFinanceSummary
);
OrdersRouter.get(
  "/orders/:businessId",
  verifyAdminToken,
  getAllOrdersByBusiness
);

// Sub Routes -> Main Route
mainRouter.use("/auth", AuthRouter);
mainRouter.use("/", EventsRouter);
mainRouter.use("/", BusinessRouter);
mainRouter.use("/", RolesRouter);
mainRouter.use("/", OrdersRouter);

export { mainRouter as admin };
