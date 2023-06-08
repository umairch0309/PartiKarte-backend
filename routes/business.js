import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import { upload } from "../helpers/multerConfig.js";

import {
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
  updateEmail,
  getOrganizerImage,
  updateOrganizerImage,
  getOrganizersBySlug,
  addOrUpdateNews,
  updateProfile,
  setSocialLink,
} from "../controllers/businessControllers.js";

const router = express.Router();

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
router.put("/update-profile", verifyToken, updateProfile);

router.put("/set-social-link", verifyToken, setSocialLink);

// owners routes
router.put("/business-managers/add-new", verifyToken, addOrUpdateOwner);
router.delete("/business-owners/:id", verifyToken, deleteOwner);
// owners routes end
router.get("/gallery/:galleryId", getBusinessGallery);
router.put("/gallery", upload.array("images", 10), verifyToken, createGallery);
router.get("/gallery/image/:imageId", getGalleryImageById);
// managers routes
router.put("/business-managers/:id", verifyToken, AddOrUpdateManager);
router.delete("/business-managers/:id", verifyToken, deleteManager);
// managers routes end

// update business user apis starting from here
router.put("/change-username", verifyToken, updateUserName);
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

export { router as business };
