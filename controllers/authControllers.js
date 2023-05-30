import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import business from "../models/business.js";
import User from "../models/user.js";

import { userSchema } from "../helpers/validation.js";
import { generateUrlSlug } from "../helpers/helpers.js";

import HttpError from "../helpers/HttpError.js";
import { createValidationError } from "../helpers/HttpError.js";

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
    newBusiness = new business({
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

    user.business = newBusiness._id;
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
        await business.findByIdAndDelete(user._id);
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
  const { username, password } = req.body;
  if (!username || !password) {
    return next(new HttpError("Please provide a username and password", 400));
  }
  try {
    const user = await User.findOne({ username }).populate("business");
    if (!user) {
      return next(new HttpError("Invalid username or password", 401));
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log(isValidPassword);
    if (!isValidPassword) {
      return next(new HttpError("Invalid username or password", 401));
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res
      .status(200)
      .json({ userId: user._id, token, businessId: user.business._id });
  } catch (error) {
    console.log(error);
    return next(new HttpError("Can't login due to server error", 500));
  }
};
