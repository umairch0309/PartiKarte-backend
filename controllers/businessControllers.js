import business from "../models/business.js";
import Image from "../models/image.js";
import path from "path";
import fs from "fs";
import { isImageFile } from "../helpers/helpers.js";
import uploadS3Image from "../utils/uploadS3Image.js";
import { IMAGE_TYPES } from "../utils/constants.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import { findBusinessAndUser } from "../DAL/common.js";
import Business from "../models/business.js";
import User from "../models/user.js";

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
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid user id", 400));
    }

    let update = {};

    // ORGANIZER NAME CHANGE --- IF APPLIED

    // if (organizerName) {
    //   update["organizerName"] = organizerName;
    //   const dateString = new Date().toISOString().split("T")[0];
    //   const newUrlSlug = generateUrlSlug(organizerName, dateString);

    //   const existingUserWithSlug = await business.findOne({
    //     urlSlug: newUrlSlug,
    //   });
    //   if (
    //     existingUserWithSlug &&
    //     existingUserWithSlug._id.toString() !== businessId
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

    const updatedBusiness = await Business.findByIdAndUpdate(business._id, {
      $set: update,
    });

    if (!updatedBusiness) {
      return next(new HttpError("Could not update", 400));
    }

    res.status(200).json({
      message: "Company information updated",
      updatedBusiness: updatedBusiness.company,
    });
  } catch (error) {
    return next(new HttpError(error.message, 400));
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
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      throw new HttpError("Invalid Id", 404);
    }

    let update = {};
    if (email) update["contactInformation.email"] = email;
    if (phoneNumber) update["contactInformation.phoneNumber"] = phoneNumber;
    if (website) update["contactInformation.website"] = website;

    const updateBusiness = await Business.findByIdAndUpdate(business._id, {
      $set: update,
    });

    if (!updateBusiness) {
      return next(new HttpError("Couldn't change!", 500));
    }

    res.status(200).json({
      message: "Contact information updated",
      updateBusiness: updateBusiness.contactInformation,
    });
  } catch (error) {
    return next(ServerError(error));
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
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 404));
    }

    const mybusiness = await Business.findById(business._id);

    mybusiness.financialInformation.IBAN = IBAN;
    mybusiness.financialInformation.accountName = accountName;
    mybusiness.financialInformation.invoiceEmail = invoiceEmail;

    const updatedBusiness = await mybusiness.save();

    res.status(200).json({
      message: "Financial information updated",
      updatedBusiness: updatedBusiness.financialInformation,
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
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 404));
    }

    const mybusiness = await Business.findById(business._id);

    mybusiness.marketingInformation.metaPixelId = metaPixelId;
    mybusiness.marketingInformation.googleAnalyticsId = googleAnalyticsId;
    mybusiness.marketingInformation.apiAccessKey = apiAccessKey;

    const updatedBusiness = await mybusiness.save();

    res.status(200).json({
      message: "business settings updated",
      updatedBusiness: updatedBusiness.marketingInformation,
    });
  } catch (error) {
    next(new HttpError(error.message, 400));
  }
};

/**
 * @method  updateProfile
 * @param {*} req
 * @param {*} res
 * @returns Updates account profile information
 */

export const updateProfile = async (req, res, next) => {
  const userId = req.userId;
  const { username, email } = req.body;

  const { profile_image } = req.files;

  let uploadedImage;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
      ...(email && { email }),
      ...(username && { username }),
    });

    if (!user || !business) {
      throw new HttpError("Invalid id", 404);
    } else if (user && business && (username || email)) {
      throw new HttpError("Please choose a unique username or email", 409);
    }

    const myUser = await User.findById(user._id);

    if (myUser && req.files && profile_image) {
      const fileType = profile_image.mimetype;
      if (IMAGE_TYPES.includes(fileType)) {
        try {
          const filename = path.basename(profile_image.name);
          uploadedImage = await uploadS3Image(
            filename,
            "profile_images/",
            profile_image.data,
            next
          );

          if (!uploadedImage.status || !uploadedImage.uploadedImagePath) {
            throw new HttpError("Couldn't upload image due to S3", 500);
          }

          myUser.profile_image = uploadedImage.uploadedImagePath;
        } catch (error) {
          console.log(error);
          throw new HttpError("Couldn't upload image", 500);
        }
      }
    }

    if (email) {
      myUser.email = email;
    }

    if (username) {
      myUser.username = username;
    }

    const updatedUser = await myUser.save();

    res.status(200).json({
      message: "Business settings updated",
      updatedUser,
    });
  } catch (error) {
    next(new HttpError(error.message, 400));
  }
};

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
    const user = await business.findById(userId);
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
        return res.status(404).json({ error: "business owner not found" });
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
      .json({ message: "business owner updated", ownerId: owner._id });
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
    const user = await business.findOne({ "galleries._id": galleryId });
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
    const user = await business.findById(userId);
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

      const user = await business.findOne({ _id: userId });
      user.managers.push(newManager);
      await user.save();
      manager = user.managers[user.managers.length - 1];
    } else {
      const user = await User.findOne({ _id: userId });
      manager = user.managers.id(managerId);
      if (!manager) {
        return res.status(404).json({ error: "business manager not found" });
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
    res.status(200).json({
      message: "business manager updated",
      managerId: manager._id,
    });
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
    const user = await business.findOne({ _id: userId });
    const owner = user.owners.id(ownerId);

    if (!owner) {
      return res.status(404).json({ error: "business owner not found" });
    }

    user.owners.pull(owner);
    await user.save();
    res.status(200).json({ message: "business owner deleted" });
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
    const user = await business.findOne({ _id: userId });
    const manager = user.managers.id(managerId);

    if (!manager) {
      return res.status(404).json({ error: "business manager not found" });
    }

    user.managers.pull(manager);
    await user.save();
    res.status(200).json({ message: "business manager deleted" });
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
    const user = await business.findByIdAndUpdate(
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
    const user = await business.findByIdAndUpdate(
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

export const updateOrganizerImage = async (req, res, next) => {
  const userId = req.userId;

  try {
    const user = await business.findById(userId);
    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    const fileBuffer = req.file.buffer;

    // Check if the file is an image
    await isImageFile(fileBuffer);

    const newImage = new Image({
      name: req.file.originalname,
      filePath: req.file.path,
      contentType: req.file.mimetype,
    });
    await newImage.save();
    const organizerImage = newImage._id;

    if (user.organizerImage) {
      const oldImage = await Image.findById(user.organizerImage);
      if (oldImage.filePath && fs.existsSync(oldImage.filePath)) {
        await fs.promises.unlink(oldImage.filePath);
      }
      await Image.deleteOne({ _id: user.organizerImage });
    }

    user.set({ organizerImage });
    await user.save();

    res.status(201).send({ id: newImage._id });
  } catch (error) {
    console.error(error);
    return next(new HttpError("Server error", 500));
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
      const organizer = await business
        .findOne({ urlSlug: urlSlug })
        .populate("organizerImage news events");
      if (!organizer) {
        return res.status(404).json({ message: "Organizer not found" });
      }
      businessUsers = [organizer];
    } else {
      businessUsers = await business
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

    const business = await business.findById(businessId);
    if (!business) {
      return res.status(404).send("business not found");
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

export const setSocialLink = async (req, res, next) => {
  const userId = req.userId;
  const platform = req.body.platform;
  const link = req.body.link;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    const myBusiness = await Business.findById(business._id);

    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    // Set the social link based on the specified platform
    switch (platform) {
      case "facebook":
        myBusiness.socialLinks.facebook = link;
        break;
      case "instagram":
        myBusiness.socialLinks.instagram = link;
        break;
      case "website":
        myBusiness.socialLinks.website = link;
        break;
      case "twitter":
        myBusiness.socialLinks.twitter = link;
        break;
      case "other":
        myBusiness.socialLinks.other = link;
        break;
      default:
        return next(new HttpError("Invalid platform", 400));
    }

    const updatedBusiness = await myBusiness.save();

    if (!updatedBusiness) {
      return next(new HttpError("Couldn't perform task", 500));
    }

    res.status(200).json({
      message: "Social link updated",
      businessLinks: updatedBusiness.socialLinks,
    });
  } catch (error) {
    return next(ServerError(error));
  }
};
