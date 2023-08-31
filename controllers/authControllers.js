import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import Business from "../models/business.js";
import User from "../models/user.js";

import { userSchema } from "../helpers/validation.js";
import { generateOTP, generateUrlSlug } from "../helpers/helpers.js";

import HttpError, { ServerError } from "../helpers/HttpError.js";
import { createValidationError } from "../helpers/HttpError.js";
import { findBusinessAndUser } from "../DAL/common.js";
import { SendOtpEmail, SendVerifyOtpEmail } from "../helpers/sendEmail.js";

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
    // const { error } = userSchema.validate({ email });
    // if (error) throw error;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    console.log(email, username);

    if (existingUser) {
      return next(new HttpError("Username or email already taken", 404));
    }

    console.log(existingUser);

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

    const { otp, expiry } = generateOTP();

    user.otp = otp;
    user.otpExpiry = expiry;
    user.verifyEmailRequested = true;

    const result = await SendVerifyOtpEmail({
      email: user?.email,
      otp,
    });

    // Save the new user
    await user.save();
    // Save the new business
    await newBusiness.save();

    res.status(201).json({
      message: "User registered successfully. Please check your email for otp.",
      _id: user._id,
      data: {
        verifyEmailRequested: true,
      },
    });
  } catch (error) {
    console.log(error);
    // If an error occurred, rollback the changes by deleting the created business
    if (user) {
      await User.findByIdAndDelete(user._id);
    }

    if (error.name === "ValidationError") {
      console.log(createValidationError(error));
      return next(
        new HttpError("Please enter unique registery or vat number", 409)
      );
    } else {
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

      return res.status(400).send({
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

    res.status(200).json({
      message: "Login successful",
      data: {
        userId: user._id,
        token,
        role: user.role,
        businessId: user.businessId,
      },
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
    if (newPassword === password) {
      return next(new HttpError("Old and new passwords cannot be same.", 400));
    }

    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid user id", 404));
    }
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return next(new HttpError("Invalid old password", 400));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword, salt },
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
 * @method  forgotPassword
 * @param {*} req
 * @param {*} res
 * @returns Changes password
 * need to be merged 1
 */
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    if (!email) {
      return next(new HttpError("Please provide email.", 400));
    }

    const { user, business } = await findBusinessAndUser({ email });
    if (!user || !business) {
      return next(new HttpError("Invalid user id", 404));
    }

    const { otp, expiry } = generateOTP();

    const updatedUser = await User.findByIdAndUpdate(
      user?._id,
      { otp, otpExpiry: expiry },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Something went wrong" });
    }

    const result = await SendOtpEmail({
      email: updatedUser?.email,
      otp,
    });

    console.log("emai response");
    if (!result) {
      res.status(500).json({ error: error.message });
    }

    res.status(200).json({
      message: "Reset pasword otp generated and sent to your email address.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;

  try {
    if (!email) {
      return next(new HttpError("Please provide email.", 400));
    }

    const { user, business } = await findBusinessAndUser({ email });
    if (!user || !business) {
      return next(new HttpError("Invalid user id", 404));
    }

    if (new Date().getTime() > new Date(user?.otpExpiry)?.getTime()) {
      return next(
        new HttpError("Otp is expired. Please generate a new one.", 400)
      );
    }

    if (otp !== user?.otp) {
      return next(new HttpError("Otp doesn't match.", 400));
    }

    const updatedUser = await User.findByIdAndUpdate(
      user?._id,
      {
        otp: "",
        otpExpiry: "",
        ...(!user?.isEmailVerified &&
          user?.verifyEmailRequested && {
            isEmailVerified: true,
            verifyEmailRequested: false,
          }),
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Something went wrong" });
    }

    res.status(200).json({
      message: "Otp verified successfully.",
      data: {
        ...(user?.verifyEmailRequested && { verifyEmailRequested: true }),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const resetPassword = async (req, res, next) => {
  const { password, confirmPassword, email } = req.body;

  try {
    if (confirmPassword !== password) {
      return next(new HttpError("Passwords doesn't match.", 400));
    }

    const { user, business } = await findBusinessAndUser({ email });
    if (!user || !business) {
      return next(new HttpError("Invalid user id", 404));
    }
    const isPasswordSame = await bcrypt.compare(password, user?.password);

    if (isPasswordSame) {
      return next(
        new HttpError("Old password and new password cannot be same.", 400)
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const updatedUser = await User.findByIdAndUpdate(
      user?._id,
      { password: hashedPassword, salt },
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

export const profileDetails = async (req, res, next) => {
  const userId = req.userId;

  console.log(userId);

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid user id", 400));
    }

    res
      .status(200)
      .json({ message: "Business user", data: { user, business } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
