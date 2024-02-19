import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import {
  generateOTP,
  generateRandomCode,
  isImageFile,
} from "../helpers/helpers.js";

import HttpError, { ServerError } from "../helpers/HttpError.js";
import { createValidationError } from "../helpers/HttpError.js";
import {
  SendMemberAdditionEmail,
  SendOtpEmail,
  SendPasswordChangedEmail,
  SendVerifyOtpEmail,
} from "../helpers/sendEmail.js";
import Role from "../models/role.js";
import Admin from "../models/admin.js";
import AdminRole from "../models/adminRole.js";
import uploadS3Image from "../utils/uploadS3Image.js";

/**
 * @method  register
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns registers user
 */
export const register = async (req, res, next) => {
  const { email, name } = req.body;

  let admin;

  try {
    // Check if user already exists
    const existingAdmin = await Admin.findOne({
      email,
    });

    if (existingAdmin) {
      return next(new HttpError("Username or email already taken", 404));
    }

    console.log(existingAdmin);

    const password = generateRandomCode(8);

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || "123456", salt);

    admin = new Admin({
      role: "admin",
      email,
      name,
      password: hashedPassword,
      salt,
    });

    const { otp, expiry } = generateOTP();

    admin.otp = otp;
    admin.otpExpiry = expiry;
    admin.verifyEmailRequested = true;

    const result = await SendVerifyOtpEmail({
      email: admin?.email,
      otp,
    });

    await SendMemberAdditionEmail({
      email,
      password: password || "123456",
      role: "admin",
      company: "Partikarte",
    });

    // Save the new user
    await admin.save();

    res.status(201).json({
      message:
        "Admin registered successfully. Please check your email for otp.",
      _id: admin?._id,
      data: {
        verifyEmailRequested: true,
      },
    });
  } catch (error) {
    console.log(error);
    // If an error occurred, rollback the changes by deleting the created business
    if (admin) {
      await Admin.findByIdAndDelete(admin._id);
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
    return next(new HttpError("Please provide an email and password", 400));
  }

  try {
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return next(new HttpError("Invalid email or password", 401));
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    console.log(isValidPassword);

    if (!isValidPassword) {
      return next(new HttpError("Invalid email or password", 401));
    }
    if (!admin?.isEmailVerified) {
      const { otp, expiry } = generateOTP();

      const updatedUser = await Admin.findByIdAndUpdate(
        admin?._id,
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

    const token = jwt.sign({ _id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "90h",
    });

    const permissions = await AdminRole.findById(admin?.permissions);

    res.status(200).json({
      message: "Login successful",
      data: {
        userId: admin?._id,
        token,
        role: admin.role,
        permissions: permissions?.permissions || [],
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

    const admin = await Admin.findById(userId);
    if (!admin) {
      return next(new HttpError("Invalid admin id", 404));
    }
    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      return next(new HttpError("Invalid old password", 400));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await Admin.findByIdAndUpdate(
      userId,
      { password: hashedPassword, salt },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Something went wrong" });
    }

    await SendPasswordChangedEmail({
      email: admin?.email,
    });

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

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return next(new HttpError("Invalid admin id", 404));
    }

    const { otp, expiry } = generateOTP();

    const updatedUser = await Admin.findByIdAndUpdate(
      admin?._id,
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

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return next(new HttpError("Invalid admin id", 404));
    }

    if (new Date().getTime() > new Date(admin?.otpExpiry)?.getTime()) {
      return next(
        new HttpError("Otp is expired. Please generate a new one.", 400)
      );
    }

    if (otp !== admin?.otp) {
      return next(new HttpError("Otp doesn't match.", 400));
    }

    const updatedUser = await Admin.findByIdAndUpdate(
      admin?._id,
      {
        otp: "",
        otpExpiry: "",
        ...(!admin?.isEmailVerified &&
          admin?.verifyEmailRequested && {
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
        ...(admin?.verifyEmailRequested && { verifyEmailRequested: true }),
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

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return next(new HttpError("Invalid admin id", 404));
    }
    const isPasswordSame = await bcrypt.compare(password, admin?.password);

    if (isPasswordSame) {
      return next(
        new HttpError("Old password and new password cannot be same.", 400)
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const updatedUser = await Admin.findByIdAndUpdate(
      admin?._id,
      { password: hashedPassword, salt },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Something went wrong" });
    }

    await SendPasswordChangedEmail({
      email,
    });

    res.status(200).json({ message: "Password updated" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const profileDetails = async (req, res, next) => {
  const userId = req.userId;

  console.log(userId);

  try {
    const admin = await Admin.findById(userId);
    if (!admin) {
      return next(new HttpError("Invalid admin id", 404));
    }

    // console.log(admin, "admin");

    const permissions = await AdminRole.findById(admin?.permissions);

    res.status(200).json({
      message: "Administrator",
      data: {
        user: {
          ...admin?.toObject(),
          permissions: permissions?.permissions || [],
        },
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const changeProfileDetails = async (req, res, next) => {
  const userId = req.userId;
  const { username } = req.body;
  let uploadedImage;

  try {
    const admin = await Admin.findById(userId);
    if (!admin) {
      return next(new HttpError("Invalid admin id", 404));
    }

    if (admin && req.files) {
      console.log(req.files[0]);
      isImageFile(req.files[0]?.mimetype, next);

      const uploadedImageObj = await uploadS3Image(
        req.files[0],
        "profile_images/",
        next
      );
      if (uploadedImageObj.uploadedImagePath && uploadedImageObj.status) {
        uploadedImage = uploadedImageObj.uploadedImagePath;
      }
    }

    const updatedUser = await Admin.findByIdAndUpdate(
      userId,
      {
        name: username,
        ...(uploadedImage && { profile_image: uploadedImage }),
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Something went wrong" });
    }

    res.status(200).json({ message: "Profile updated" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
