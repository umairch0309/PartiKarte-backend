import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import sharp from "sharp";
import { upload } from "../helpers/multerConfig.js";

import {
  register,
  authenticate,
  updateBusinessInformation,
  updateBusinessContact,
  updateBusinessFinancialInformation,
  updateBusinessMarketingInformation,
  addOrUpdateOwner,
  getBusinessGallery,
  createGallery,
  getGalleryImageById,
  AddOrUpdateManager,
  deleteOwner,
  deleteManager,
  updateUserName,
  updatePassword,
  requestResetPassword,
  resetPassword,
  updateEmail,
  getOrganizerImage,
  updateOrganizerImage,
  getOrganizersBySlug,
  addOrUpdateNews,
  updateBusinessSocialDesc,
} from "../controllers/businessUsersController.js";

dotenv.config();

const router = express.Router();
router.use(bodyParser.json());

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

router.post("/register", register);
router.post("/authentication", authenticate);
router.put("/information", verifyToken, updateBusinessInformation);
router.put("/contact-information", verifyToken, updateBusinessContact);
router.put(
  "/financial-information",
  verifyToken,
  updateBusinessFinancialInformation
);
router.put(
  "/marketing-information",
  verifyToken,
  updateBusinessMarketingInformation
);
// /business/organizer-image" to be placed here

// owners routes
router.put("/business-owners/:id", verifyToken, addOrUpdateOwner);
router.delete("/business-owners/:id", verifyToken, deleteOwner);
// owners routes end
router.get("/gallery/:galleryId", getBusinessGallery);
router.put("/gallery", upload.array("images", 10), verifyToken, createGallery);
router.get("/gallery/image/:imageId", getGalleryImageById);
// managers routes
router.put("/business-managers/:id", verifyToken, AddOrUpdateManager);
router.delete("/business-managers/:id", verifyToken, deleteManager);
// managers routes end

// reset password to be placed here
router.post("/reset-password", verifyToken, requestResetPassword);
router.post("/reset-password/:token", resetPassword);

// update business user apis starting from here
router.put("/change-username", verifyToken, updateUserName);
router.put("/change-password", verifyToken, updatePassword);
router.put("/change-email", verifyToken, updateEmail);
router.get("/organizer-image/:id", getOrganizerImage);
router.put(
  "/organizer-image",
  upload.single("image"),
  verifyToken,
  updateOrganizerImage
);
router.get("/organizers/:urlSlug?", getOrganizersBySlug);
router.put("/news/:newsId?", verifyToken, addOrUpdateNews);
router.put("/description", verifyToken, updateBusinessSocialDesc);

// TRIED IMPLEMENTATION OF OPTIMIZED IMAGE SETTING

// async function preprocessImage(imagePath) {
//   const optimizedImage = sharp(imagePath);
//   optimizedImage.jpeg({ quality: 80 });
//   const newPath = path.join(
//     path.dirname(imagePath),
//     path.basename(imagePath, path.extname(imagePath)) +
//       ".optimized" +
//       path.extname(imagePath)
//   );
//   await optimizedImage.toFile(newPath);
//   return newPath;
// }

// router.put(
//   "/organizer-image",
//   upload.single("image"),
//   verifyToken,
//   async (req, res) => {
//     const userId = req.userId;

//     try {
//       // Comment out or remove the line below:
//       // const optimizedPath = await preprocessImage(req.file.path);

//       const newImage = new Image({
//         name: req.file.originalname,
//         filePath: req.file.path, // Use the original image path
//         contentType: req.file.mimetype,
//       });
//       await newImage.save();
//       const organizerImage = newImage._id;

//       const user = await businessUser.findById(userId);
//       if (!user) {
//         return res.status(404).json({ error: "User not found" });
//       }

//       if (user.organizerImage) {
//         const oldImage = await Image.findById(user.organizerImage);
//         if (oldImage.filePath && fs.existsSync(oldImage.filePath)) {
//           fs.unlinkSync(oldImage.filePath);
//         }
//         await Image.deleteOne({ _id: user.organizerImage });
//       }

//       user.set({ organizerImage });
//       await user.save();

//       res.status(201).send({ id: newImage._id });
//     } catch (error) {
//       console.error(error);
//       res.status(500).send("Server error");
//     }
//   }
// );

export { router as businessUsers };
