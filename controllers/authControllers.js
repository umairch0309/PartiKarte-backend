import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import Business from "../models/business.js";
import User from "../models/user.js";

import { userSchema } from "../helpers/validation.js";
import { generateUrlSlug } from "../helpers/helpers.js";

import HttpError, { ServerError } from "../helpers/HttpError.js";
import { createValidationError } from "../helpers/HttpError.js";
import { findBusinessAndUser } from "../DAL/common.js";
import sendEmail from "../helpers/sendEmail.js";

/**
 * @method  register
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns registers user
 */
export const register = async (req, res, next) => {
  const {
    email,
    username,
    password,
    companyName,
    companyVAT,
    companyRegistryNumber,
    addressDescription,
    city,
    postalCode,
    country,
  } = req.body;

  let user, newBusiness;

  try {
    // Validate user input
    const { error } = userSchema.validate({ email, username, password });
    if (error) throw error;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return next(new HttpError("Username or email already taken", 409));
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      role: "admin",
      email,
      username,
      password: hashedPassword,
      salt,
      urlSlug: generateUrlSlug(username),
      address: {
        addressDescription,
        city,
        postalCode,
        country,
      },
    });

    // Create a new business instance
    newBusiness = new Business({
      businessManagers: [user._id], // Add the user ID to the businessManagers array
      organizerName: username,
      urlSlug: generateUrlSlug(username),
      company: {
        companyName,
        companyVAT,
        companyRegistryNumber,
        companyAddress: {
          addressDescription,
          city,
          postalCode,
          country,
        },
      },
    });

    user.businessId = newBusiness._id;
    // Save the new user
    await user.save();
    // Save the new business
    await newBusiness.save();

    res
      .status(201)
      .json({ message: "User created successfully", _id: user._id });
  } catch (error) {
    console.log(error);
    if (error.name === "ValidationError") {
      return next(createValidationError(error));
    } else {
      console.log(error);
      // If an error occurred, rollback the changes by deleting the created business
      if (user) {
        await Business.findByIdAndDelete(user._id);
      }
      return next(
        new HttpError("Unexpected error occurred while creating business", 500)
      );
    }
  }
};

/**
 * @method authenticate
 * @param {*} req
 * @param {*} res
 * @returns authenticates user and returns user and auth token
 */
export const authenticate = async (req, res, next) => {
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

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "90h",
    });

    res.status(200).json({
      userId: user._id,
      token,
      role: user.role,
      businessId: user.businessId,
    });
  } catch (error) {
    console.log(error);
    return next(new HttpError("Can't login due to server error", 500));
  }
};

/**
 * @method  updatePassword
 * @param {*} req
 * @param {*} res
 * @returns Changes password
 * need to be merged 1
 */
export const updatePassword = async (req, res, next) => {
  const userId = req.userId;
  const { newPassword, password } = req.body;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid user id", 400));
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log(isValidPassword);
    if (!isValidPassword) {
      return next(new HttpError("Invalid old password", 400));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Something went wrong" });
    }

    res.status(200).json({ message: "Password updated" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * @method  requestResetPassword
 * @param {*} req
 * @param {*} res
 * @returns  reset password link is sent to email of the user including token to reset
 */

export const requestResetPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const token = crypto.randomBytes(20).toString("hex");
    const user = await User.findOneAndUpdate(
      { email },
      { resetPasswordToken: token, resetPasswordExpires: Date.now() + 3600000 },
      { new: true }
    );

    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    const emailContent = {
      subject: "Reset Password Request",
      text: `To reset your password, click the following link or paste it into your browser (expires in 1 hour):\n
        http://127.0.0.1:4000/users/reset-password/${token}\n`,
    };

    const sendResetPasswordEmail = await sendEmail(email, emailContent, next);

    if (sendResetPasswordEmail) {
      res.status(200).json({ message: "Reset password link sent to email" });
    }
  } catch (error) {
    console.error(error);
    return next(new HttpError("Server error", 500));
  }
};

/**
 * @method  resetPassword
 * @param {*} req
 * @param {*} res
 * @returns password is reset on the basis of token and password received
 */

export const resetPassword = async (req, res, next) => {
  const { password } = req.body;
  const { token } = req.params;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new HttpError("Invalid or expired token", 400));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: "Password updated" });
  } catch (error) {
    console.error(error);
    return next(ServerError(error));
  }
};
