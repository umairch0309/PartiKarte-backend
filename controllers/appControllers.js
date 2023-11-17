import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import HttpError, { ServerError } from "../helpers/HttpError.js";
import Event from "../models/event.js";
import Business from "../models/business.js";

import { findBusinessAndUser } from "../DAL/common.js";
import { SendVerifyOtpEmail } from "../helpers/sendEmail.js";
import Role from "../models/role.js";
import { generateOTP } from "../helpers/helpers.js";
import Order from "../models/order.js";
import User from "../models/user.js";
import Guest from "../models/guest.js";

// sign in as guest
export async function signInAsGuest(req, res, next) {
  const { eventCode } = req.body;
  try {
    const event = await Event.findOne({ eventCode });
    if (!event) {
      return res.status(404).json({ message: "Invalid code." });
    }
    const token = jwt.sign({ _id: eventCode }, process.env.JWT_SECRET, {
      expiresIn: "90h",
    });
    return res.json({ event, token });
  } catch (err) {
    return ServerError(err);
  }
}

// login as manager
export const authenticateForApp = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new HttpError("Please provide a email and password", 400));
  }

  try {
    const foundPerson = await findBusinessAndUser({ email });
    const { user, business } = foundPerson;

    if (!user) {
      return next(new HttpError("Invalid email or password", 401));
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log(isValidPassword);

    if (!isValidPassword) {
      return next(new HttpError("Invalid email or password", 401));
    }
    if (!user?.isEmailVerified) {
      const { otp, expiry } = generateOTP();

      const updatedUser = await User.findByIdAndUpdate(
        user?._id,
        { otp, otpExpiry: expiry, verifyEmailRequested: true },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: "Something went wrong" });
      }

      const result = await SendVerifyOtpEmail({
        email: updatedUser?.email,
        otp,
      });

      return res.status(401).send({
        message:
          "Account not verified!. Please check your email and verify your account.",
        data: {
          verifyEmailRequested: true,
        },
      });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "90h",
    });

    const permissions = await Role.findById(user?.permissions);

    res.status(200).json({
      message: "Login successful",
      data: {
        userId: user._id,
        token,
        role: user.role,
        permissions: permissions?.permissions || [],
        businessId: user.businessId,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new HttpError("Can't login due to server error", 500));
  }
};

// get all events in app
export const getAllEventsInApp = async (req, res, next) => {
  const userId = req.userId;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const events = await Event.find({ businessId: business?._id }).sort({
      _id: -1,
    });

    res.status(200).json({ events });
  } catch (error) {
    return next(ServerError(error));
  }
};

// get event in app
export const getEventInApp = async (req, res, next) => {
  const { eventId } = req.params;

  try {
    const event = await Event.findById(eventId);
    res.status(200).json({ event });
  } catch (error) {
    return next(ServerError(error));
  }
};

// scan event in app
export const scanEventInApp = async (req, res, next) => {
  const { eventId, orderId, ticketId } = req.query;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return next(new HttpError("Invalid", 400));
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return next(new HttpError("Invalid", 400));
    }

    const ticket = order.tickets.find((ticket) => ticket.ticketId == ticketId);
    if (!ticket) {
      return next(new HttpError("Invalid", 400));
    }

    if (ticket.scannedTickets >= ticket.noOfTickets) {
      return next(new HttpError("Exists", 400));
    } else {
      ticket.scannedTickets += 1;
      await order.save();
      event.scannedTickets += 1;
      await event.save();
    }

    res.status(200).json({ message: "Success", order, event });
  } catch (error) {
    return next(ServerError(error));
  }
};

// Get all guests
export const getAllGuestsInApp = async (req, res) => {
  const { eventId } = req.params;

  try {
    if (eventId && eventId !== "undefined") {
      const guests = await Guest.find({ eventId }).sort({ _id: -1 });
      return res.status(200).json({ guests });
    }
    return res.status(404).json({ message: "Not found" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch guests." });
  }
};

// Get all guests
export const markGuestAsPresent = async (req, res) => {
  const { guestId } = req.params;

  try {
    if (guestId && guestId !== "undefined") {
      const guest = await Guest.findByIdAndUpdate(
        guestId,
        { isPresent: true },
        { new: true }
      );
      return res.status(200).json({ guest });
    }
    return res.status(404).json({ message: "Not found" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch guests." });
  }
};
