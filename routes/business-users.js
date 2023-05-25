import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import businessUser from "../models/businessUser.js";
import verifyToken from "../middlewares/verifyToken.js";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import multer from "multer";
import Image from "../models/eventImage.js";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import unidecode from "unidecode";
import {
  register,
  authenticate,
  updateBusinessInformation,
  updateBusinessContact,
  addOrUpdateOwner,
  getBusinessGallery,
  getGalleryImageById,
  AddOrUpdateManager,
  deleteOwner,
  deleteManager,
  updateUserName,
  updatePassword,
  updateEmail
} from "../controllers/businessUsersController.js";

dotenv.config();

const router = express.Router();
router.use(bodyParser.json());

mongoose.connect(process.env.MONGO_DB_URL);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", function () {
  console.log("Connected to MongoDB database");
});

/**
 * @swagger
 * /business/register:
 *   post:
 *     tags:
 *       - Business
 *     summary: Register a new business user
 *     description: This endpoint allows for the registration of a new business user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Successfully registered new user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *       '400':
 *         description: Invalid request - missing email, username or password
 *       '409':
 *         description: Conflict - Username or email already taken
 */
router.post("/business/register", register);
router.post("/business/authentication", authenticate);
router.put("/business/information", verifyToken, updateBusinessInformation);
router.put("/business/contact-information", verifyToken, updateBusinessContact);

// /business/organizer-image" to be placed here

// owners routes
router.put("/business/business-owners/:id", verifyToken, addOrUpdateOwner);
router.delete("/business/business-owners/:id", verifyToken, deleteOwner);
// owners routes end
router.get("/business/gallery/:galleryId", getBusinessGallery);
router.get("/business/gallery/image/:imageId", getGalleryImageById);
// managers routes
router.put("/business/business-managers/:id", verifyToken, AddOrUpdateManager);
router.delete("/business/business-managers/:id", verifyToken, deleteManager);
// managers routes end

// reset password to be placed here

// update business user apis starting from here
router.put("/business/change-username", verifyToken, updateUserName);
router.put("/business/change-password", verifyToken, updatePassword);
router.put("/business/change-email", verifyToken, updateEmail);

// router.post('/business/register', async (req, res, next) => {
//     try {
//         const { email, username, password } = req.body;

//         // Validate user input
//         const { error } = userSchema.validate({ email, username, password });
//         if (error) throw error;

//         // Check if user already exists
//         const existingUser = await businessUser.findOne({ $or: [{ email }, { username }] });
//         if (existingUser) {
//             return res.status(409).json({ message: 'Username or email already taken' });
//         }

//         // Hash the password
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(password, salt);

//         // Save the new user
//         // Save the new user with salt
//         const user = new businessUser({ email, username, password: hashedPassword, salt });

//         await user.save();

//         res.status(201).json({ message: 'User created successfully', _id: user._id });
//     } catch (error) {
//         next(error);
//     }
// });

// router.post('/business/authentication', async (req, res) => {
//     const { username, password } = req.body;
//     if (!username || !password) {
//         return res.status(400).json({ error: 'Please provide a username and password' });
//     }
//     try {
//         const user = await businessUser.findOne({ username });
//         if (!user) {
//             return res.status(401).json({ error: 'Invalid username or password' });
//         }

//         const isValidPassword = await bcrypt.compare(password, user.password);
//         if (!isValidPassword) {
//             return res.status(401).json({ error: 'Invalid username or password' });
//         }

//         const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

//         res.status(200).json({ token });
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// });

// router.put('/business/information', verifyToken, async (req, res) => {
//     const userId = req.userId;
//     const { organizerName, taxNumber, companyName, companyAddress, companyRegistryNumber } = req.body;

//     try {
//         const user = await businessUser.findById(userId);
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         let update = {};
//         if (organizerName) {
//             update['organizerName'] = organizerName;
//             const dateString = new Date().toISOString().split('T')[0];
//             const newUrlSlug = generateUrlSlug(organizerName, dateString);

//             const existingUserWithSlug = await businessUser.findOne({ urlSlug: newUrlSlug });
//             if (existingUserWithSlug && existingUserWithSlug._id.toString() !== userId) {
//                 return res.status(409).json({ error: 'URL slug already exists' });
//             }

//             update['urlSlug'] = newUrlSlug;
//         }
//         if (taxNumber) update['company.taxNumber'] = taxNumber;
//         if (companyName) update['company.companyName'] = companyName;
//         if (companyAddress) update['company.companyAddress'] = companyAddress;
//         if (companyRegistryNumber) update['company.companyRegistryNumber'] = companyRegistryNumber;

//         await businessUser.findByIdAndUpdate(userId, { $set: update });

//         res.status(200).json({ message: 'Company information updated' });
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// });

// router.put('/business/contact-information', verifyToken, async (req, res) => {
//     const userId = req.userId;
//     const { email, phoneNumber, website } = req.body;

//     try {
//         const user = await businessUser.findById(userId);
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         let update = {};
//         if (email) update['contactInformation.email'] = email;
//         if (phoneNumber) update['contactInformation.phoneNumber'] = phoneNumber;
//         if (website) update['contactInformation.website'] = website;

//         await businessUser.findByIdAndUpdate(userId, { $set: update });

//         res.status(200).json({ message: 'Contact information updated' });
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// });

// router.put('/business/business-owners/:id', verifyToken, async (req, res) => {
//     const userId = req.userId;
//     const ownerId = req.params.id;

//     const { ownerName, ownerSurname, ownerDOB, ownerAddress, ownerIDFront, ownerIDBack } = req.body;

//     try {
//         const user = await businessUser.findById(userId);
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         let owner;
//         if (ownerId === 'new') {
//             // Create a new business owner if it doesn't exist
//             const newOwner = {
//                 ownerName,
//                 ownerSurname,
//                 ownerDOB,
//                 ownerAddress,
//                 ownerIDFront,
//                 ownerIDBack,
//             };

//             user.owners.push(newOwner);
//             owner = user.owners[user.owners.length - 1];
//         } else {
//             // Update an existing business owner
//             owner = user.owners.id(ownerId);
//             if (!owner) {
//                 return res.status(404).json({ error: 'Business owner not found' });
//             }

//             owner.set({
//                 ownerName,
//                 ownerSurname,
//                 ownerDOB,
//                 ownerAddress,
//                 ownerIDFront,
//                 ownerIDBack,
//             });
//         }

//         await user.save();
//         res.status(200).json({ message: 'Business owner updated', ownerId: owner._id });
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// });

// router.get("/business/gallery/:galleryId", async (req, res) => {
//   const galleryId = req.params.galleryId;
//   console.log("Received galleryId:", galleryId);

//   try {
//     const user = await businessUser.findOne({ "galleries._id": galleryId });
//     console.log("Fetched businessUser:", user);
//     if (!user) {
//       return res.status(404).send("Gallery not found");
//     }

//     const gallery = user.galleries.id(galleryId);
//     if (!gallery) {
//       return res.status(404).send("Gallery not found");
//     }

//     const images = await Image.find({ _id: { $in: gallery.images } });

//     res.status(200).json({ images });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Error fetching gallery images");
//   }
// });
// router.get("/business/gallery/image/:imageId", async (req, res) => {
//     try {
//       const imageId = req.params.imageId;
//       const image = await Image.findById(imageId);
//       if (image) {
//         res.set("Content-Type", image.contentType);
//         res.set("Cache-Control", "public, max-age=31536000"); // Cache the image for 1 year (in seconds)
//         res.sendFile(path.resolve(image.filePath)); // Serve the file from the filesystem
//       } else {
//         res.status(404).json({ message: "Image not found" });
//       }
//     } catch (error) {
//       res.status(500).json({ message: "Error fetching image", error });
//     }
//   });

// router.put("/business/business-managers/:id", verifyToken, async (req, res) => {
//     const userId = req.userId;
//     const managerId = req.params.id;

//     const {
//       managerName,
//       managerSurname,
//       managerDOB,
//       managerAddress,
//       managerIDFront,
//       managerIDBack,
//       managerTitle,
//     } = req.body;

//     try {
//       let manager;
//       if (managerId === "new") {
//         const newManager = {
//           managerName,
//           managerSurname,
//           managerDOB,
//           managerAddress,
//           managerIDFront,
//           managerIDBack,
//           managerTitle,
//         };

//         const user = await businessUser.findOne({ _id: userId });
//         user.managers.push(newManager);
//         await user.save();
//         manager = user.managers[user.managers.length - 1];
//       } else {
//         const user = await User.findOne({ _id: userId });
//         manager = user.managers.id(managerId);
//         if (!manager) {
//           return res.status(404).json({ error: "Business manager not found" });
//         }
//         manager.set({
//           managerName,
//           managerSurname,
//           managerDOB,
//           managerAddress,
//           managerIDFront,
//           managerIDBack,
//           managerTitle,
//         });
//         await user.save();
//       }
//       res
//         .status(200)
//         .json({ message: "Business manager updated", managerId: manager._id });
//     } catch (error) {
//       res.status(400).json({ error: error.message });
//     }
// });
// router.delete(
//     "/business/business-owners/:id",
//     verifyToken,
//     async (req, res) => {
//       const userId = req.userId;
//       const ownerId = req.params.id;

//       try {
//         const user = await businessUser.findOne({ _id: userId });
//         const owner = user.owners.id(ownerId);

//         if (!owner) {
//           return res.status(404).json({ error: "Business owner not found" });
//         }

//         user.owners.pull(owner);
//         await user.save();
//         res.status(200).json({ message: "Business owner deleted" });
//       } catch (error) {
//         res.status(400).json({ error: error.message });
//       }
//     }
//   );

// DELETE a manager by ID
// router.delete(
//     "/business/business-managers/:id",
//     verifyToken,
//     async (req, res) => {
//       const userId = req.userId;
//       const managerId = req.params.id;

//       try {
//         const user = await businessUser.findOne({ _id: userId });
//         const manager = user.managers.id(managerId);

//         if (!manager) {
//           return res.status(404).json({ error: "Business manager not found" });
//         }

//         user.managers.pull(manager);
//         await user.save();
//         res.status(200).json({ message: "Business manager deleted" });
//       } catch (error) {
//         res.status(400).json({ error: error.message });
//       }
//     }
//   );

// router.put("/business/change-username", verifyToken, async (req, res) => {
//     const userId = req.userId;
//     const { newUsername } = req.body;
  
//     try {
//       const user = await businessUser.findByIdAndUpdate(
//         userId,
//         { username: newUsername },
//         { new: true }
//       );
  
//       if (!user) {
//         return res.status(404).json({ error: "User not found" });
//       }
  
//       res
//         .status(200)
//         .json({ message: "Username updated", username: user.username });
//     } catch (error) {
//       res.status(400).json({ error: error.message });
//     }
//   });

// router.put("/business/change-password", verifyToken, async (req, res) => {
//     const userId = req.userId;
//     const { newPassword } = req.body;
  
//     try {
//       const salt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(newPassword, salt);
//       const user = await businessUser.findByIdAndUpdate(
//         userId,
//         { password: hashedPassword },
//         { new: true }
//       );
  
//       if (!user) {
//         return res.status(404).json({ error: "User not found" });
//       }
  
//       res.status(200).json({ message: "Password updated" });
//     } catch (error) {
//       res.status(400).json({ error: error.message });
//     }
//   });

// router.put("/business/change-email", verifyToken, async (req, res) => {
//     const userId = req.userId;
//     const { newEmail } = req.body;
  
//     try {
//       const user = await businessUser.findByIdAndUpdate(
//         userId,
//         { email: newEmail },
//         { new: true }
//       );
  
//       if (!user) {
//         return res.status(404).json({ error: "User not found" });
//       }
  
//       res.status(200).json({ message: "Email updated", email: user.email });
//     } catch (error) {
//       res.status(400).json({ error: error.message });
//     }
//   });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = "uploads/";
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

async function preprocessImage(imagePath) {
  const optimizedImage = sharp(imagePath);
  optimizedImage.jpeg({ quality: 80 });
  const newPath = path.join(
    path.dirname(imagePath),
    path.basename(imagePath, path.extname(imagePath)) +
      ".optimized" +
      path.extname(imagePath)
  );
  await optimizedImage.toFile(newPath);
  return newPath;
}

router.put(
  "/business/organizer-image",
  upload.single("image"),
  verifyToken,
  async (req, res) => {
    const userId = req.userId;

    try {
      // Comment out or remove the line below:
      // const optimizedPath = await preprocessImage(req.file.path);

      const newImage = new Image({
        name: req.file.originalname,
        filePath: req.file.path, // Use the original image path
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
  }
);

router.post("/business/reset-password", async (req, res) => {
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
});

router.post("/business/reset-password/:token", async (req, res) => {
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
});







router.get("/business/organizer-image/:id", async (req, res) => {
  try {
    const imageId = req.params.id;
    console.log("ImageId:", imageId);
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
});

router.get("/business/organizers/:urlSlug?", async (req, res) => {
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
});

router.put(
  "/business/organizer-image",
  upload.single("image"),
  verifyToken,
  async (req, res) => {
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
  }
);

function generateUrlSlug(organizerName) {
  const decodedName = unidecode(organizerName);
  return decodedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

router.put("/businesses/news/:newsId?", verifyToken, async (req, res) => {
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
});

router.put("/businesses/description", verifyToken, async (req, res) => {
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
});

const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = "uploads/";
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload2 = multer({ storage: storage2 });

router.put(
  "/business/gallery",
  upload2.array("images", 10),
  verifyToken,
  async (req, res) => {
    console.log(req.body, req.files); // Add this line
    const userId = req.userId;
    const files = req.files;
    const galleryName = req.body.name;
    const eventRefId = req.body.event;

    try {
      if (!galleryName) {
        return res.status(400).json({ error: "Gallery name is required" });
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

      const user = await businessUser.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
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
  }
);

export { router as businessUsers };
