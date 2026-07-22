import Notification from "../models/notification.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import { findBusinessAndUser } from "../DAL/common.js";

export const getBusinessNotifications = async (req, res, next) => {
  try {
    const { user, business } = await findBusinessAndUser({ _id: req.userId });
    if (!user || !business) {
      return next(new HttpError("Invalid business", 400));
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ businessId: business._id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({
        businessId: business._id,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      message: "Notifications fetched",
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("getBusinessNotifications", error);
    return next(ServerError(error));
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { user, business } = await findBusinessAndUser({ _id: req.userId });
    if (!user || !business) {
      return next(new HttpError("Invalid business", 400));
    }

    const { notificationId } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, businessId: business._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return next(new HttpError("Notification not found", 404));
    }

    return res.status(200).json({
      message: "Notification marked as read",
      data: { notification },
    });
  } catch (error) {
    console.error("markNotificationRead", error);
    return next(ServerError(error));
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const { user, business } = await findBusinessAndUser({ _id: req.userId });
    if (!user || !business) {
      return next(new HttpError("Invalid business", 400));
    }

    const result = await Notification.updateMany(
      { businessId: business._id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      message: "All notifications marked as read",
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error("markAllNotificationsRead", error);
    return next(ServerError(error));
  }
};
