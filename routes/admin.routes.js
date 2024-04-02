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
  changeSingleBusinessStatus,
} from "../controllers/admin/businesses.js";
import {
  getAllOrdersByBusiness,
  getBusinessRevenueByMonth,
  getLatestOrders,
  getOrdersByTimeInterval,
  getOrderDetailsById,
} from "../controllers/admin/orders.js";

import {
  getAllRoles,
  createRole,
  updateRole,
  getRole,
  deleteRole,
} from "../controllers/admin/roles.js";

import { business } from "./admin/business.js";
import { events } from "./admin/events.js";
import { tickets } from "./admin/tickets.js";
import { contact } from "./admin/contact.js";
import { news } from "./admin/news.js";
import { orders } from "./admin/orders.js";
import { guests } from "./admin/guests.js";
import { transactions } from "./admin/transactions.js";
import { coupons } from "./admin/coupon.js";
import { roles } from "./admin/roles.js";
import {
  refundOrderPayment,
  resendTicketsToCustomer,
} from "../controllers/orderControllers.js";

const mainRouter = express.Router();

// AUTH ROUTES
const AuthRouter = express.Router();
AuthRouter.post("/login", authenticate);
AuthRouter.post("/register", verifyAdminToken, register);
AuthRouter.put("/update-admin/:adminId", verifyAdminToken, updateAdmin);
AuthRouter.delete("/delete-admin/:adminId", verifyAdminToken, deleteAdmin);
AuthRouter.get("/get-all-admins", verifyAdminToken, getAllAdmins);
AuthRouter.put("/change-password", verifyAdminToken, updatePassword);
AuthRouter.post("/forgot-password", forgotPassword);
AuthRouter.post("/verify-otp", verifyOtp);
AuthRouter.post("/reset-password", resetPassword);
AuthRouter.get("/get-profile", verifyAdminToken, profileDetails);
AuthRouter.put("/update-profile", verifyAdminToken, changeProfileDetails);

// BUSINESS ROUTES
const BusinessRouter = express.Router();
BusinessRouter.get("/businesses", getAllBusinesses);
BusinessRouter.get("/business/:businessId/get-single", getSingleBusinesses);
BusinessRouter.put(
  "/business/:businessId/change-status",
  changeSingleBusinessStatus
);

// EVENTS ROUTES
const EventsRouter = express.Router();
EventsRouter.get("/admin-events", verifyAdminToken, getAllEvents);
EventsRouter.get("/admin-events/active", verifyAdminToken, getActiveEvents);
EventsRouter.get("/admin-events/:eventId", verifyAdminToken, getEvent);
EventsRouter.delete("/events/delete/:id", verifyAdminToken, deleteEvent);

// ORDERS ROUTES
const OrdersRouter = express.Router();
OrdersRouter.get(
  "/admin-orders/latest-orders",
  verifyAdminToken,
  getLatestOrders
);
OrdersRouter.get(
  "/admin-orders/order-detail/:orderId",
  verifyAdminToken,
  getOrderDetailsById
);
OrdersRouter.put(
  "/admin-orders/refund-order/:orderId",
  verifyAdminToken,
  refundOrderPayment
);
OrdersRouter.put(
  "/admin-orders/order/:orderId/resend-tickets",
  verifyAdminToken,
  resendTicketsToCustomer
);
OrdersRouter.get(
  "/admin-orders/:businessId",
  verifyAdminToken,
  getAllOrdersByBusiness
);
OrdersRouter.get(
  "/admin-orders/by-time/:interval",
  verifyAdminToken,
  getOrdersByTimeInterval
);
OrdersRouter.get(
  "/admin-orders/get-revenue-by-month/:month",
  verifyAdminToken,
  getBusinessRevenueByMonth
);

const RolesRouter = express.Router();

RolesRouter.get("/admin-roles/roles", verifyAdminToken, getAllRoles);

RolesRouter.get("/admin-roles/roles/:roleId", verifyAdminToken, getRole);

RolesRouter.post(
  "/admin-roles/roles/create-role",
  verifyAdminToken,
  createRole
);

RolesRouter.put(
  "/admin-roles/roles/update-role/:roleId",
  verifyAdminToken,
  updateRole
);

RolesRouter.delete(
  "/admin-roles/roles/delete-role/:roleId",
  verifyAdminToken,
  deleteRole
);

// Sub Routes -> Main Route
mainRouter.use("/auth", AuthRouter);
mainRouter.use("/", EventsRouter);
mainRouter.use("/", BusinessRouter);
mainRouter.use("/", OrdersRouter);
mainRouter.use("/", RolesRouter);

mainRouter.use("/business", business);
mainRouter.use("/", orders);
mainRouter.use("/", news);
mainRouter.use("/", roles);
mainRouter.use("/transactions", transactions);
mainRouter.use("/", events);
mainRouter.use("/", coupons);
mainRouter.use("/", tickets);
mainRouter.use("/", guests);
mainRouter.use("/", contact);

export { mainRouter as admin };
