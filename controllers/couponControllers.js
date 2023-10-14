import { findBusinessAndUser } from "../DAL/common.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import Coupon from "../models/coupon.js";
import Event from "../models/event.js";

const generateCouponCode = async () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const codeLength = 8;
  let couponCode = "";

  for (let i = 0; i < codeLength; i++) {
    couponCode += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  const existingCoupon = await Coupon.findOne({ code: couponCode });
  if (existingCoupon) {
    return generateCouponCode();
  }
  return couponCode;
};

export const createCoupon = async (req, res, next) => {
  const userId = req.userId;

  const { eventId } = req.params;
  const { discount } = req.body;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });

    const event = await Event.findById(eventId);

    if (!user || !business || !event) {
      return next(new HttpError("Invalid Id", 404));
    }

    const coupon = new Coupon({
      code: await generateCouponCode(),
      eventId: event?._id,
      businessId: business?._id,
      userId: user?._id,
      discount: parseFloat(discount),
    });

    if (!coupon) {
      return next(new HttpError("Couldn't create generate coupon code.", 400));
    }

    await coupon.save();

    res.status(200).send({ message: "Coupon created!", coupon });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const updateCoupon = async (req, res, next) => {
  const userId = req.userId;
  const { eventId, id } = req.params;
  const { discount } = req.body;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });

    const event = await Event.findById(eventId);

    if (!user || !business || !event) {
      return next(new HttpError("Invalid Id", 404));
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      { code: await generateCouponCode(), discount: parseFloat(discount) },
      { new: true }
    );

    if (!updatedCoupon) {
      return next(new HttpError("Coupon not found", 404));
    }

    res.status(200).send({ message: "Coupon updated!", coupon: updatedCoupon });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const expireCoupon = async (req, res, next) => {
  const userId = req.userId;
  const { eventId, id } = req.params;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });

    const event = await Event.findById(eventId);

    if (!user || !business || !event) {
      return next(new HttpError("Invalid Id", 404));
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      { isExpired: true },
      { new: true }
    );

    if (!updatedCoupon) {
      return next(new HttpError("Coupon not found", 404));
    }

    res.status(200).send({ message: "Coupon expired!", coupon: updatedCoupon });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const activateCoupon = async (req, res, next) => {
  const userId = req.userId;
  const { eventId, id } = req.params;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });

    const event = await Event.findById(eventId);

    if (!user || !business || !event) {
      return next(new HttpError("Invalid Id", 404));
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      { isExpired: false },
      { new: true }
    );

    if (!updatedCoupon) {
      return next(new HttpError("Coupon not found", 404));
    }

    res
      .status(200)
      .send({ message: "Coupon activated!", coupon: updatedCoupon });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const getCoupon = async (req, res, next) => {
  const userId = req.userId;
  const { eventId } = req.params;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });

    if (!eventId || eventId === "undefined") {
      return next(new HttpError("Invalid Id", 404));
    }

    const event = await Event.findById(eventId);

    if (!user || !business || !event) {
      return next(new HttpError("Invalid Id", 404));
    }

    const coupon = await Coupon.findOne({
      userId: user?._id,
      eventId: event?._id,
      businessId: business?._id,
    });

    if (!coupon) {
      return next(new HttpError("Coupon not found", 404));
    }

    res.status(200).send({ message: "Coupon Got!", coupon });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};
