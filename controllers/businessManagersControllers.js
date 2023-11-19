import bcrypt from "bcrypt";
import { generateRandomCode, isImageFile } from "../helpers/helpers.js";
import { userSchema } from "../helpers/validation.js";
import uploadS3Image from "../utils/uploadS3Image.js";
import HttpError, {
  ServerError,
  createValidationError,
} from "../helpers/HttpError.js";
import { findBusinessAndUser } from "../DAL/common.js";
import { generateUrlSlug } from "../helpers/helpers.js";
import Business from "../models/business.js";
import User from "../models/user.js";
import { SendMemberAdditionEmail } from "../helpers/sendEmail.js";

export const getAllBusinessManagers = async (req, res, next) => {
  const userId = req.userId;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    const businessManagers = await User.find({
      businessId: business?._id,
      dob: { $exists: true, $ne: null },
    });
    if (!businessManagers) {
      return next(new HttpError("Managers not found", 404));
    }

    res.status(200).send({
      message: "All Managers",
      data: businessManagers,
    });
  } catch (error) {
    return next(new ServerError(error));
  }
};

export const addBusinessManager = async (req, res, next) => {
  const userId = req.userId;

  const {
    name,
    surname,
    email,
    role,
    dob,
    guestType,
    addressDescription,
    city,
    postalCode,
    country,
    permissions,
  } = req.body;

  const password = generateRandomCode(8);

  const [IDFront, IDBack] = req.files;

  const username = `${name}${surname}`.replace(" ", "");

  let newUser, myBusiness, savedBusiness;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    myBusiness = await Business.findById(user.businessId);
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    // Validate user input
    const { error } = userSchema.validate({
      email,
      username,
      password: password || "123456",
    });
    if (error) throw error;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return next(new HttpError("Username or email already taken", 409));
    }

    isImageFile(IDFront.mimetype, next);
    isImageFile(IDBack.mimetype, next);

    const uploadedIDFront = await uploadS3Image(IDFront, "id_images/", next);
    const uploadedIDBack = await uploadS3Image(IDBack, "id_images/", next);

    if (
      uploadedIDFront.uploadedImagePath &&
      uploadedIDFront.status &&
      uploadedIDBack.uploadedImagePath &&
      uploadedIDBack.status
    ) {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password || "123456", salt);

      newUser = new User({
        name,
        surname,
        email,
        username,
        password: hashedPassword,
        role,
        dob,
        permissions,
        IDFront: uploadedIDFront.uploadedImagePath,
        IDBack: uploadedIDBack.uploadedImagePath,
        guestType,
        salt,
        urlSlug: generateUrlSlug(username),
        address: {
          addressDescription,
          city,
          postalCode,
          country,
        },
      });

      newUser.businessId = myBusiness._id;
      myBusiness.businessManagers.push(newUser._id);
      // Save the new user
      await newUser.save();
      // Save the new business
      savedBusiness = await myBusiness.save();

      await SendMemberAdditionEmail({
        email,
        password: password || "123456",
        role,
        company: myBusiness?.company?.companyName,
      });
    }

    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    if (!savedBusiness && newUser) {
      await User.findByIdAndDelete(newUser._id);
    }
    console.log(error);
    if (error.name === "ValidationError") {
      return next(new HttpError("Please enter correct inputs", 409));
    } else {
      return next(new HttpError(error, 500));
    }
  }
};

export const updateBusinessManager = async (req, res, next) => {
  const userId = req.userId;
  const managerId = req.params.managerId;

  const {
    name,
    surname,
    role,
    dob,
    guestType,
    addressDescription,
    city,
    postalCode,
    country,
  } = req.body;

  const [IDFront, IDBack] = req.files;

  let IDFrontLink, IDBackLink;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }

    // Check if the manager already exists
    const existingUser = await User.findById(managerId);
    if (!existingUser) {
      return next(new HttpError("Manager not found", 404));
    }

    if (IDFront && IDBack) {
      isImageFile(IDFront.mimetype, next);
      isImageFile(IDBack.mimetype, next);

      const uploadedIDFront = await uploadS3Image(IDFront, "id_images/", next);
      const uploadedIDBack = await uploadS3Image(IDBack, "id_images/", next);

      if (
        uploadedIDFront.uploadedImagePath &&
        uploadedIDFront.status &&
        uploadedIDBack.uploadedImagePath &&
        uploadedIDBack.status
      ) {
        IDBackLink = uploadedIDBack.uploadedImagePath;
        IDFrontLink = uploadedIDFront.uploadedImagePath;
      }
    }

    // Update the manager details
    existingUser.role = "admin";
    existingUser.name = name;
    existingUser.surname = surname;
    existingUser.role = role;
    existingUser.dob = dob;
    existingUser.IDFront = IDFrontLink ? IDFrontLink : existingUser.IDFront;
    existingUser.IDBack = IDBackLink ? IDBackLink : existingUser.IDBack;
    existingUser.guestType = guestType;
    existingUser.address = {
      addressDescription,
      city,
      postalCode,
      country,
    };

    // Save the updated user
    await existingUser.save();

    res
      .status(200)
      .json({ message: "User updated successfully", user: existingUser });
  } catch (error) {
    return next(new HttpError(error, 500));
  }
};

export const deleteBusinessManager = async (req, res, next) => {
  const userId = req.userId;
  const managerId = req.params.managerId;
  let existingUser;
  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    const myBusiness = await Business.findById(user.businessId);
    if (!user || !business) {
      return next(new HttpError("Invalid id", 400));
    }
    const oldBusinessManagers = myBusiness.businessManagers;
    myBusiness.businessManagers = myBusiness.businessManagers.filter(
      (manager) => manager.toString() !== managerId
    );

    console.log(
      oldBusinessManagers.length - 1,
      myBusiness.businessManagers.length
    );

    if (oldBusinessManagers.length - 1 === myBusiness.businessManagers.length) {
      existingUser = await User.findByIdAndDelete(managerId);
      if (!existingUser) {
        return next(new HttpError("Manager not found", 404));
      }
      myBusiness.save();
    } else {
      return next(new HttpError("Couldn't delete manager", 404));
    }

    res
      .status(200)
      .send({ message: "Manager deleted successfully", data: existingUser });
  } catch (error) {
    return next(new ServerError(error));
  }
};
