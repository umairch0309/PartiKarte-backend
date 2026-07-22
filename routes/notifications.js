import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import {
  getBusinessNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notificationControllers.js";

const router = express.Router();

router.get("/", verifyToken, getBusinessNotifications);
router.patch("/read-all", verifyToken, markAllNotificationsRead);
router.patch("/:notificationId/read", verifyToken, markNotificationRead);

export { router as notifications };
