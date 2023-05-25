import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import businessUser from "../models/businessUser.js";
import Image from "../models/eventImage.js";
import path from "path";
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
  try {
    const {
      email,
      username,
      password,
      companyName,
      companyVAT,
      companyRegistryNumber,
      city,
      postalCode,
      country,
    } = req.body;

    // Validate user input
    const { error } = userSchema.validate({ email, username, password });
    if (error) throw error;

    // Check if user already exists
    const existingUser = await businessUser.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return next(new HttpError("Username or email already taken", 409));
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new businessUser instance
    const user = new businessUser({
      email,
      username,
      password: hashedPassword,
      salt,
      organizerName: username,
      urlSlug: generateUrlSlug(username),
      company: {
        companyName,
        companyVAT,
        companyRegistryNumber,
        companyAddress: {
          city,
          postalCode,
          country,
        },
      },
    });

    // Save the new user
    await user.save();

    res
      .status(201)
      .json({ message: "User created successfully", _id: user._id });
  } catch (error) {
    console.log(error);
    if (error.name === "ValidationError") {
      return next(createValidationError(error));
    } else {
      console.log(error);
      return next(
        new HttpError("Unexpected error occured while creating business", 500)
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
    const user = await businessUser.findOne({ username });
    if (!user) {
      return next(new HttpError("Invalid username or password", 401));
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return next(new HttpError("Invalid username or password", 401));
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ user, token });
  } catch (error) {
    return next(new HttpError(error.message, 400));
  }
};

/**
 * @method  updateBusinessInformation
 * @param {*} req
 * @param {*} res
 * @returns Updates business info
 */
export const updateBusinessInformation = async (req, res, next) => {
  const userId = req.userId;
  const {
    // organizerName,
    taxNumber,
    companyName,
    companyAddress,
    companyRegistryNumber,
  } = req.body;

  try {
    const user = await businessUser.findById(userId);
    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    let update = {};

    // ORGANIZER NAME CHANGE --- IF APPLIED

    // if (organizerName) {
    //   update["organizerName"] = organizerName;
    //   const dateString = new Date().toISOString().split("T")[0];
    //   const newUrlSlug = generateUrlSlug(organizerName, dateString);

    //   const existingUserWithSlug = await businessUser.findOne({
    //     urlSlug: newUrlSlug,
    //   });
    //   if (
    //     existingUserWithSlug &&
    //     existingUserWithSlug._id.toString() !== userId
    //   ) {
    //     return next(new HttpError("URL slug already exists", 409));
    //   }

    //   update["urlSlug"] = newUrlSlug;
    // }

    if (taxNumber) update["company.taxNumber"] = taxNumber;
    if (companyName) update["company.companyName"] = companyName;
    if (companyAddress) update["company.companyAddress"] = companyAddress;
    if (companyRegistryNumber)
      update["company.companyRegistryNumber"] = companyRegistryNumber;

    const updatedUser = await businessUser.findByIdAndUpdate(userId, {
      $set: update,
    });

    res
      .status(200)
      .json({ message: "Company information updated", updatedUser });
  } catch (error) {
    next(new HttpError(error.message, 400));
  }
};

/**
 * @method  updateBusinessContact
 * @param {*} req
 * @param {*} res
 * @returns Updates business contact
 */
export const updateBusinessContact = async (req, res, next) => {
  const userId = req.userId;
  const { email, phoneNumber, website } = req.body;

  try {
    const user = await businessUser.findById(userId);
    if (!user) {
      throw new HttpError("User not found", 404);
    }

    let update = {};
    if (email) update["contactInformation.email"] = email;
    if (phoneNumber) update["contactInformation.phoneNumber"] = phoneNumber;
    if (website) update["contactInformation.website"] = website;

    await businessUser.findByIdAndUpdate(userId, { $set: update });

    res.status(200).json({ message: "Contact information updated" });
  } catch (error) {
    next(new HttpError(error.message, 400));
  }
};

/**
 * @method  updateBusinessFinancialInformation
 * @param {*} req
 * @param {*} res
 * @returns Updates business financial information
 */
export const updateBusinessFinancialInformation = async (req, res, next) => {
  const userId = req.userId;
  const { IBAN, accountName, invoiceEmail } = req.body;

  try {
    const user = await businessUser.findById(userId);
    if (!user) {
      throw new HttpError("User not found", 404);
    }

    user.financialInformation.IBAN = IBAN;
    user.financialInformation.accountName = accountName;
    user.financialInformation.invoiceEmail = invoiceEmail;

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Financial information updated",
      updatedUser: updatedUser.financialInformation,
    });
  } catch (error) {
    next(new HttpError(error.message, 400));
  }
};

/**
 * @method  updateBusinessMarketingInformation
 * @param {*} req
 * @param {*} res
 * @returns Updates business marketing information
 */

export const updateBusinessMarketingInformation = async (req, res, next) => {
  const userId = req.userId;
  const { metaPixelId, googleAnalyticsId, apiAccessKey } = req.body;

  try {
    const user = await businessUser.findById(userId);
    if (!user) {
      throw new HttpError("User not found", 404);
    }

    user.marketingInformation.metaPixelId = metaPixelId || user.metaPixelId;
    user.marketingInformation.googleAnalyticsId =
      googleAnalyticsId || user.googleAnalyticsId;
    user.marketingInformation.apiAccessKey = apiAccessKey || user.apiAccessKey;

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Business settings updated",
      updatedUser: updatedUser,
    });
  } catch (error) {
    next(new HttpError(error.message, 400));
  }
};

/**
 * @method  for business/organizer-image" to be placed here
 * @param {*} req
 * @param {*} res
 * @returns Updates organizer image
 * working on it
 */

/**
 * @method  addOrUpdateOwner
 * @param {*} req
 * @param {*} res
 * @returns Adds/Updates business owner information
 */
export const addOrUpdateOwner = async (req, res) => {
  const userId = req.userId;
  const ownerId = req.params.id;

  const {
    ownerName,
    ownerSurname,
    ownerDOB,
    ownerAddress,
    ownerIDFront,
    ownerIDBack,
  } = req.body;

  try {
    const user = await businessUser.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let owner;
    if (ownerId === "new") {
      // Create a new business owner if it doesn't exist
      const newOwner = {
        ownerName,
        ownerSurname,
        ownerDOB,
        ownerAddress,
        ownerIDFront,
        ownerIDBack,
      };

      user.owners.push(newOwner);
      owner = user.owners[user.owners.length - 1];
    } else {
      // Update an existing business owner
      owner = user.owners.id(ownerId);
      if (!owner) {
        return res.status(404).json({ error: "Business owner not found" });
      }

      owner.set({
        ownerName,
        ownerSurname,
        ownerDOB,
        ownerAddress,
        ownerIDFront,
        ownerIDBack,
      });
    }

    await user.save();
    res
      .status(200)
      .json({ message: "Business owner updated", ownerId: owner._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * @method  getBusinessGallery
 * @param {*} req
 * @param {*} res
 * @returns business gallery
 */
export const getBusinessGallery = async (req, res) => {
  const galleryId = req.params.galleryId;

  try {
    const user = await businessUser.findOne({ "galleries._id": galleryId });
    if (!user) {
      return res.status(404).send("Gallery not found");
    }

    const gallery = user.galleries.id(galleryId);
    if (!gallery) {
      return res.status(404).send("Gallery not found");
    }

    const images = await Image.find({ _id: { $in: gallery.images } });

    res.status(200).json({ images });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching gallery images");
  }
};

/**
 * @method  getGalleryImageById
 * @param {*} req
 * @param {*} res
 * @returns image by id
 */
export const getGalleryImageById = async (req, res) => {
  try {
    const imageId = req.params.imageId;
    const image = await Image.findById(imageId);
    if (image) {
      res.set("Content-Type", image.contentType);
      res.set("Cache-Control", "public, max-age=31536000"); // Cache the image for 1 year (in seconds)
      res.sendFile(path.resolve(image.filePath)); // Serve the file from the filesystem
    } else {
      res.status(404).json({ message: "Image not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching image", error });
  }
};

/**
 * @method  createGallery
 * @param {*} req
 * @param {*} res
 * @returns gallery is created
 */

export const createGallery = async (req, res) => {
  console.log(req.body, req.files); // Add this line

  const { files, userId } = req;
  const { galleryName, eventRefId } = req.body;

  try {
    if (!galleryName) {
      return res.status(400).json({ error: "Gallery name is required" });
    }
    const user = await businessUser.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const imageIds = [];

    for (const file of files) {
      // No optimization, use the original file path
      const originalPath = file.path;

      const newImage = new Image({
        name: file.originalname,
        filePath: originalPath,
        contentType: file.mimetype,
      });
      await newImage.save();
      imageIds.push(newImage._id);
    }

    const newGallery = {
      name: galleryName,
      images: imageIds,
    };

    if (eventRefId) {
      newGallery.event = eventRefId;
    }

    user.galleries.push(newGallery);
    await user.save();

    res
      .status(201)
      .send({ message: "Gallery created successfully", gallery: newGallery });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

/**
 * @method  AddOrUpdateManager
 * @param {*} req
 * @param {*} res
 * @returns Add/Updates business manager information
 */
export const AddOrUpdateManager = async (req, res) => {
  const userId = req.userId;
  const managerId = req.params.id;

  const {
    managerName,
    managerSurname,
    managerDOB,
    managerAddress,
    managerIDFront,
    managerIDBack,
    managerTitle,
  } = req.body;

  try {
    let manager;
    if (managerId === "new") {
      const newManager = {
        managerName,
        managerSurname,
        managerDOB,
        managerAddress,
        managerIDFront,
        managerIDBack,
        managerTitle,
      };

      const user = await businessUser.findOne({ _id: userId });
      user.managers.push(newManager);
      await user.save();
      manager = user.managers[user.managers.length - 1];
    } else {
      const user = await User.findOne({ _id: userId });
      manager = user.managers.id(managerId);
      if (!manager) {
        return res.status(404).json({ error: "Business manager not found" });
      }
      manager.set({
        managerName,
        managerSurname,
        managerDOB,
        managerAddress,
        managerIDFront,
        managerIDBack,
        managerTitle,
      });
      await user.save();
    }
    res
      .status(200)
      .json({ message: "Business manager updated", managerId: manager._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * @method  deleteOwner
 * @param {*} req
 * @param {*} res
 * @returns deletes owner
 */
export const deleteOwner = async (req, res) => {
  const userId = req.userId;
  const ownerId = req.params.id;

  try {
    const user = await businessUser.findOne({ _id: userId });
    const owner = user.owners.id(ownerId);

    if (!owner) {
      return res.status(404).json({ error: "Business owner not found" });
    }

    user.owners.pull(owner);
    await user.save();
    res.status(200).json({ message: "Business owner deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * @method  deleteManager
 * @param {*} req
 * @param {*} res
 * @returns deletes manager
 */
export const deleteManager = async (req, res) => {
  const userId = req.userId;
  const managerId = req.params.id;

  try {
    const user = await businessUser.findOne({ _id: userId });
    const manager = user.managers.id(managerId);

    if (!manager) {
      return res.status(404).json({ error: "Business manager not found" });
    }

    user.managers.pull(manager);
    await user.save();
    res.status(200).json({ message: "Business manager deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * @method  updateUserName
 * @param {*} req
 * @param {*} res
 * @returns Changes username
 * need to be merged 1
 */
export const updateUserName = async (req, res) => {
  const userId = req.userId;
  const { newUsername } = req.body;

  try {
    const user = await businessUser.findByIdAndUpdate(
      userId,
      { username: newUsername },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ message: "Username updated", username: user.username });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * @method  updatePassword
 * @param {*} req
 * @param {*} res
 * @returns Changes password
 * need to be merged 1
 */
export const updatePassword = async (req, res) => {
  const userId = req.userId;
  const { newPassword } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const user = await businessUser.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
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

export const requestResetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const token = crypto.randomBytes(20).toString("hex");
    const user = await businessUser.findOneAndUpdate(
      { email },
      { resetPasswordToken: token, resetPasswordExpires: Date.now() + 3600000 },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const transporter = nodemailer.createTransport({
      host: "mcp-5.controlpanel.si",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Password Request",
      text: `To reset your password, click the following link or paste it into your browser (expires in 1 hour):\n
        http://127.0.0.1:4000/users/reset-password/${token}\n`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error(error);
        return res.status(500).send("Server error");
      }
      res.status(200).json({ message: "Email sent" });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

/**
 * @method  resetPassword
 * @param {*} req
 * @param {*} res
 * @returns password is reset on the basis of token and password received
 */

export const resetPassword = async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  try {
    const user = await businessUser.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
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
    res.status(500).send("Server error");
  }
};

/**
 * @method  updateEmail
 * @param {*} req
 * @param {*} res
 * @returns Changes user email
 * need to be merged 1
 */
export const updateEmail = async (req, res) => {
  const userId = req.userId;
  const { newEmail } = req.body;

  try {
    const user = await businessUser.findByIdAndUpdate(
      userId,
      { email: newEmail },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Email updated", email: user.email });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * @method  getOrganizerImage
 * @param {*} req
 * @param {*} res
 * @returns gets organizer image by id
 */
export const getOrganizerImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    // console.log("ImageId:", imageId);
    const image = await Image.findById(imageId);
    console.log("Image:", image);
    if (image) {
      res.set("Content-Type", image.contentType);
      res.set("Cache-Control", "public, max-age=31536000"); // Cache the image for 1 year (in seconds)
      res.sendFile(path.resolve(image.filePath)); // Serve the file from the filesystem
    } else {
      res.status(404).json({ message: "Organizer image not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching organizer image", error });
  }
};

/**
 * @method  updateOrganizerImage
 * @param {*} req
 * @param {*} res
 * @returns updates organizer image according ot user id
 */

export const updateOrganizerImage = async (req, res) => {
  const userId = req.userId;

  try {
    // No optimization, use the original file path
    const originalPath = req.file.path;

    const newImage = new Image({
      name: req.file.originalname,
      filePath: originalPath,
      contentType: req.file.mimetype,
    });
    await newImage.save();
    const organizerImage = newImage._id;

    const user = await businessUser.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.organizerImage) {
      const oldImage = await Image.findById(user.organizerImage);
      if (oldImage.filePath && fs.existsSync(oldImage.filePath)) {
        fs.unlinkSync(oldImage.filePath);
      }
      await Image.deleteOne({ _id: user.organizerImage });
    }

    user.set({ organizerImage });
    await user.save();

    res.status(201).send({ id: newImage._id });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

/**
 * Name of the method needs to be reviewed and the code inside it.
 * @method  getOrganizersBySlug
 * @param {*} req
 * @param {*} res
 * @returns gets organizer by slugURL
 */
export const getOrganizersBySlug = async (req, res) => {
  try {
    const { urlSlug } = req.params;

    let businessUsers;

    if (urlSlug) {
      const organizer = await businessUser
        .findOne({ urlSlug: urlSlug })
        .populate("organizerImage news events");
      if (!organizer) {
        return res.status(404).json({ message: "Organizer not found" });
      }
      businessUsers = [organizer];
    } else {
      businessUsers = await businessUser
        .find({})
        .populate("organizerImage news events");
    }

    const organizers = await Promise.all(
      // needs to be reviewed
      businessUsers.map(async (user) => {
        const sortedEvents = user.events
          .filter((event) => event.eventStart < new Date())
          .sort((a, b) => b.eventStart - a.eventStart)
          .slice(0, 20);
        const lastNews = user.news.sort((a, b) => b.date - a.date)[0];
        const galleryIds = user.galleries.map((gallery) => gallery._id); // Extract gallery IDs

        return {
          organizerId: user._id,
          organizerName: user.organizerName,
          companyAddress: user.company.companyAddress,
          organizerImageId: user.organizerImage
            ? user.organizerImage._id
            : null,
          urlSlug: user.urlSlug,
          contactInformation: user.contactInformation,
          description: user.description,
          socialLinks: user.socialLinks,
          latestTwoEvents: sortedEvents.slice(0, 2),
          allPastEvents: sortedEvents,
          lastNews: lastNews,
          company: user.company,
          galleryIds: galleryIds, // Include galleryIds in the response
        };
      })
    );

    res.status(200).json(organizers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching organizers", error });
  }
};

/**
 * @method  addOrUpdateNews
 * @param {*} req
 * @param {*} res
 * @returns Add Or updates news
 */
export const addOrUpdateNews = async (req, res) => {
  try {
    const { newsId } = req.params;
    const { header, text } = req.body;
    const businessId = req.userId;

    const business = await businessUser.findById(businessId);
    if (!business) {
      return res.status(404).send("Business not found");
    }

    if (newsId) {
      // Update existing news
      const news = business.news.id(newsId);
      if (!news) {
        return res.status(404).send("News not found");
      }

      if (header) {
        news.header = header;
      }

      if (text) {
        news.text = text;
      }

      await business.save();

      res.status(200).send(news);
    } else {
      // Create new news
      const newNews = {
        header,
        text,
      };

      business.news.push(newNews);
      await business.save();

      res.status(201).send(newNews);
    }
  } catch (error) {
    res.status(500).send("Error processing news: " + error.message);
  }
};

/**
 * function needs to be merged 1
 * @method  updateBusinessSocialDesc
 * @param {*} req
 * @param {*} res
 * @returns Add Or updates news
 */
export const updateBusinessSocialDesc = async (req, res) => {
  try {
    const { description, facebook, instagram, website, twitter, other } =
      req.body;
    const businessId = req.userId;

    const business = await businessUser.findById(businessId);
    if (!business) {
      return res.status(404).send("Business not found");
    }

    if (description) {
      business.description = description;
    }

    if (facebook || instagram || website || twitter || other) {
      business.socialLinks = {
        facebook: facebook || business.socialLinks.facebook,
        instagram: instagram || business.socialLinks.instagram,
        website: website || business.socialLinks.website,
        twitter: twitter || business.socialLinks.twitter,
        other: other || business.socialLinks.other,
      };
    }

    await business.save();

    res.status(200).send({
      message: "Business description and social links updated successfully",
    });
  } catch (error) {
    res
      .status(500)
      .send(
        "Error updating business description and social links: " + error.message
      );
  }
};
