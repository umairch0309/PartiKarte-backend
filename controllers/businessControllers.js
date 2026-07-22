import { isImageFile } from "../helpers/helpers.js";
import uploadS3Image from "../utils/uploadS3Image.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import { findBusinessAndUser } from "../DAL/common.js";
import Business from "../models/business.js";
import User from "../models/user.js";
import Event from "../models/event.js";
import News from "../models/news.js";

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
    companyVAT,
    companyName,
    companyRegistryNumber,
    addressDescription,
    country,
    city,
    postalCode,
  } = req.body;

  const companyAddress = {
    addressDescription,
    country,
    city,
    postalCode,
  };

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid user id", 400));
    }

    let update = {};

    if (companyVAT) update["company.companyVAT"] = companyVAT;
    if (companyName) update["company.companyName"] = companyName;
    if (addressDescription)
      update["company.companyAddress.addressDescription"] = addressDescription;
    if (country) update["company.companyAddress.country"] = country;
    if (postalCode) update["company.companyAddress.postalCode"] = postalCode;
    if (city) update["company.companyAddress.city"] = city;

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
      return next(new HttpError("Invalid Id", 404));
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
  const { invoiceEmail } = req.body;

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 404));
    }

    const mybusiness = await Business.findById(business._id);

    if (!mybusiness.financialInformation) {
      mybusiness.financialInformation = {};
    }
    mybusiness.financialInformation.invoiceEmail = invoiceEmail;

    const updatedBusiness = await mybusiness.save();

    res.status(200).json({
      message: "Financial information updated.",
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
      message: "Marketing settings updated.",
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

  let uploadedImage;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const myUser = await User.findById(user._id);
    const imageFile = Array.isArray(req.files) ? req.files[0] : req.file || null;

    if (myUser && imageFile?.buffer) {
      isImageFile(imageFile.mimetype, next);

      const uploadedImageObj = await uploadS3Image(
        imageFile,
        "profile_images/",
        next
      );
      if (uploadedImageObj?.uploadedImagePath && uploadedImageObj.status) {
        uploadedImage = uploadedImageObj.uploadedImagePath;
      }
    }
    if (uploadedImage) {
      myUser.profile_image = uploadedImage;
    }

    console.log(uploadedImage);
    const updatedUser = await myUser.save();

    res.status(200).json({
      message: "Profile image updated successfully.",
      updatedUser,
    });
  } catch (error) {
    return next(ServerError(error));
  }
};

// GALLERIES

export const getAllGalleries = async (req, res, next) => {
  const userId = req.userId;
  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    console.log(user);
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const gallery = business.galleries;

    if (!gallery) {
      return next(new HttpError("Galleries not found", 404));
    }

    res.status(200).json({ gallery });
  } catch (error) {
    return next(ServerError(error));
  }
};

/**
 * @method  getBusinessGallery
 * @param {*} req
 * @param {*} res
 * @returns business gallery
 */
export const getBusinessGallery = async (req, res, next) => {
  const galleryId = req.params.galleryId;
  const userId = req.userId;
  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const gallery = business.galleries.find(
      (gallery) => gallery._id.toString() === galleryId
    );

    if (!gallery) {
      return new HttpError("Galleries not found", 404);
    }

    res.status(200).json({ gallery });
  } catch (error) {
    return next(ServerError(error));
  }
};

/**
 * @method  createGallery
 * @param {*} req
 * @param {*} res
 * @returns gallery is created
 */

export const createGallery = async (req, res, next) => {
  console.log(req.body, req.files); // Add this line

  const { files, userId } = req;
  const { galleryName, event, date } = req.body;
  const isNoEvent = event === "no-specific-event";
  try {
    if (!galleryName || !event || !date) {
      return res
        .status(400)
        .json({ error: "Gallery details are not completed" });
    }
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    const myBusiness = await Business.findById(user.businessId);
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const eventRef = isNoEvent ? true : await Event.findById(event);
    if (!eventRef) {
      return next(new HttpError("Event not found", 404));
    }

    const images = [];

    for (const file of files) {
      isImageFile(file.mimetype, next);

      const uploadedImage = await uploadS3Image(file, "gallery_images/", next);

      if (uploadedImage.uploadedImagePath && uploadedImage.status) {
        images.push(uploadedImage.uploadedImagePath);
      }
    }

    const newGallery = {
      name: galleryName,
      event: isNoEvent ? null : eventRef._id,
      startingDate: date,
      images,
    };

    myBusiness.galleries.push(newGallery);
    const savedBusiness = await myBusiness.save();

    if (!savedBusiness) {
      return next(new HttpError("Couldn't save gallery", 404));
    }

    res
      .status(201)
      .send({ message: "Gallery created successfully", gallery: newGallery });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const updateGallery = async (req, res, next) => {
  console.log(req.body, req.files); // Add this line

  const { files, userId } = req;
  const { galleryId } = req.params;
  const { galleryName, event, date, images } = req.body;
  const isNoEvent = event === "no-specific-event";

  try {
    if (!galleryName || !event || !date) {
      return res
        .status(400)
        .json({ error: "Gallery details are not completed" });
    }
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });

    const myBusiness = await Business.findById(user.businessId);
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const eventRef = isNoEvent ? true : await Event.findById(event);
    if (!eventRef) {
      return next(new HttpError("Event not found", 404));
    }

    const gallery = myBusiness.galleries.find(
      (gallery) => gallery._id.toString() === galleryId
    );

    if (!gallery) {
      return next(new HttpError("Gallery not found", 404));
    }

    const newImages = [...images];

    for (const file of files) {
      isImageFile(file.mimetype, next);

      const uploadedImage = await uploadS3Image(file, "gallery_images/", next);

      if (uploadedImage.uploadedImagePath && uploadedImage.status) {
        newImages.push(uploadedImage.uploadedImagePath);
      }
    }

    gallery.name = galleryName;
    gallery.event = isNoEvent ? null : event;
    gallery.startingDate = date;
    gallery.images = newImages;
    const savedBusiness = await myBusiness.save();

    if (!savedBusiness) {
      return next(new HttpError("Couldn't save gallery", 404));
    }

    res
      .status(201)
      .send({ message: "Gallery updated successfully", gallery: gallery });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const deleteBusinessGallery = async (req, res, next) => {
  const galleryId = req.params.galleryId;
  const userId = req.userId;
  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    const myBusiness = await Business.findById(user.businessId);
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const deletedGallery = myBusiness.galleries.filter(
      (gallery) => gallery._id.toString() === galleryId
    );

    if (!(deletedGallery.length > 0)) {
      return next(new HttpError("Gallery not found", 404));
    }

    const remainingGalleries = myBusiness.galleries.filter(
      (gallery) => gallery._id.toString() !== galleryId
    );

    myBusiness.galleries = remainingGalleries;
    const savedBusiness = await myBusiness.save();
    if (!savedBusiness) {
      return next(new HttpError("Couldn't delete", 500));
    }

    res
      .status(200)
      .json({ message: "Gallery has been deleted.", deletedGallery });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const deleteImageFromGallery = async (req, res, next) => {
  const { galleryId, imageId } = req.params;

  try {
    const { userId } = req;
    const { user } = await findBusinessAndUser({
      _id: userId,
    });

    if (!user) {
      return next(new HttpError("Invalid Id", 404));
    }

    const myBusiness = await Business.findOne({
      _id: user.businessId,
    });

    if (!myBusiness) {
      return next(new HttpError("Business or Gallery not found", 404));
    }

    const gallery = myBusiness.galleries.find(
      (g) => g._id.toString() === galleryId
    );

    if (!gallery) {
      return next(new HttpError("Gallery not found", 404));
    }
    const updatedImages = gallery.images.filter(
      (image, index) => index !== parseInt(imageId)
    );

    if (gallery.galleryPreview === parseInt(imageId)) {
      gallery.galleryPreview = 0;
    }

    gallery.images = updatedImages;

    await myBusiness.save();

    res.status(200).json({ message: "Image deleted successfully", gallery });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const setImageAsPreview = async (req, res, next) => {
  const { galleryId, imageId } = req.params;

  try {
    const { userId } = req;
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }
    const myBusiness = await Business.findOne({
      _id: user.businessId,
    });

    if (!myBusiness) {
      return next(new HttpError("Business or Gallery not found", 404));
    }

    const gallery = myBusiness.galleries.find(
      (g) => g._id.toString() === galleryId
    );

    if (!gallery) {
      return next(new HttpError("Gallery not found", 404));
    }
    console.log(imageId);
    const index = gallery?.images?.findIndex(
      (image, index) => index === parseInt(imageId)
    );
    console.log(index);

    gallery.galleryPreview = index > 0 ? index : 0;

    await myBusiness.save();

    res
      .status(200)
      .json({ message: "Image marked as gallery preview.", gallery });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const getOrganizerDetails = async (req, res, next) => {
  const userId = req.userId;
  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    res.status(200).send({
      business,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching organizer image", error });
  }
};

export const updateOrganizerDetails = async (req, res, next) => {
  const userId = req.userId;
  const [organizerImage, organizerImageBanner] = req.files;
  const { companyName, email, phoneNumber, website, description } = req.body;

  let organizerLink, organizerBannerLink;
  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    const myBusiness = await Business.findById(user.businessId);
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    if (organizerImage || organizerImageBanner) {
      if (organizerImageBanner) {
        isImageFile(organizerImageBanner.mimetype, next);

        const uploadedImage = await uploadS3Image(
          organizerImageBanner,
          "organizer_images/",
          next
        );

        if (uploadedImage.uploadedImagePath && uploadedImage.status) {
          organizerBannerLink = uploadedImage.uploadedImagePath;
        }
      }
      if (organizerImage) {
        isImageFile(organizerImage.mimetype, next);

        const uploadedImage = await uploadS3Image(
          organizerImage,
          "organizer_images/",
          next
        );

        if (uploadedImage.uploadedImagePath && uploadedImage.status) {
          organizerLink = uploadedImage.uploadedImagePath;
        }
      }
    }
    console.log(organizerLink, organizerBannerLink);
    myBusiness.company.companyName = companyName;
    myBusiness.contactInformation.email = email;
    myBusiness.contactInformation.phoneNumber = phoneNumber;
    myBusiness.description = description;
    if (organizerLink) myBusiness.organizerImage = organizerLink;
    if (organizerBannerLink)
      myBusiness.organizerImageBanner = organizerBannerLink;

    const savedBusiness = myBusiness.save();

    if (!savedBusiness) {
      return next(new HttpError("Couldn't update", 500));
    }

    res.status(200).send({
      message: "Organizer details updated successfully",
      data: { business: myBusiness },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching organizer image", error });
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
    myBusiness.socialLinks[platform] = link;

    const updatedBusiness = await myBusiness.save();

    if (!updatedBusiness) {
      return next(new HttpError("Couldn't perform task", 500));
    }

    res.status(200).json({
      message: "Social link saved successfully.",
      businessLinks: updatedBusiness.socialLinks,
    });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const deleteSocialLink = async (req, res, next) => {
  const userId = req.userId;
  const platform = req.params.platform;

  console.log(platform);

  try {
    const { user, business } = await findBusinessAndUser({ _id: userId });
    const myBusiness = await Business.findById(business._id);

    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    // Delete the social link based on the specified platform
    if (myBusiness.socialLinks.hasOwnProperty(platform)) {
      myBusiness.socialLinks[platform] = undefined;
      console.log(
        "Social link deleted. Updated socialLinks:",
        myBusiness.socialLinks
      );
    }

    const updatedBusiness = await myBusiness.save();

    if (!updatedBusiness) {
      return next(new HttpError("Couldn't perform task", 500));
    }

    res.status(200).json({
      message: "Social link deleted successfully.",
      businessLinks: updatedBusiness.socialLinks,
    });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const getAllBusinessesForCustomer = async (req, res, next) => {
  try {
    const allBusinesses = await Business.find();
    res.status(200).json({
      message: "Social link deleted successfully.",
      businesses: allBusinesses,
    });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const getSingleBusinessesForCustomer = async (req, res, next) => {
  const { businessId } = req.params;
  try {
    const business = await Business.findById(businessId);

    if (!business) {
      return next(new HttpError("Not found", 404));
    }

    const events = await Event.find({
      businessId: business?._id,
      tickets: { $exists: true, $not: { $size: 0 } },
    })
      .sort({ _id: -1 })
      .limit(4);

    const news = await News.find({ businessId: business?._id })
      .sort({ _id: -1 })
      .limit(4);

    res.status(200).json({
      message: "Social link deleted successfully.",
      data: { business, events, news },
    });
  } catch (error) {
    return next(ServerError(error));
  }
};
