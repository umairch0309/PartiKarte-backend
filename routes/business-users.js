import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import bodyParser from "body-parser";
import dotenv from "dotenv";
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
} from "../controllers/businessControllers.js";

dotenv.config();

const router = express.Router();
router.use(bodyParser.json());

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

// owners routes
router.put("/businessUser-owners/:id", verifyToken, addOrUpdateOwner);
router.delete("/businessUser-owners/:id", verifyToken, deleteOwner);
// owners routes end
router.get("/gallery/:galleryId", getBusinessGallery);
router.put("/gallery", upload.array("images", 10), verifyToken, createGallery);
router.get("/gallery/image/:imageId", getGalleryImageById);
// managers routes
router.put("/businessUser-managers/:id", verifyToken, AddOrUpdateManager);
router.delete("/businessUser-managers/:id", verifyToken, deleteManager);
// managers routes end

// reset password to be placed here
router.post("/reset-password", verifyToken, requestResetPassword);
router.post("/reset-password/:token", resetPassword);

// update businessUser user apis starting from here
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
router.get("/organizers/:urlSlug", getOrganizersBySlug);
router.put("/news/:newsId", verifyToken, addOrUpdateNews);
router.put("/description", verifyToken, updateBusinessSocialDesc);

export { router as businessUsers };
