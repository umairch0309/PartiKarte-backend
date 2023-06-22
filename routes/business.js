import express from "express";
import verifyToken from "../middlewares/verifyToken.js";

import {
  updateBusinessInformation,
  updateBusinessContact,
  updateBusinessFinancialInformation,
  updateBusinessMarketingInformation,
  getBusinessGallery,
  createGallery,
  updateProfile,
  setSocialLink,
  getAllGalleries,
  deleteBusinessGallery,
  getOrganizerDetails,
  updateOrganizerDetails,
} from "../controllers/businessControllers.js";
import {
  addBusinessManager,
  deleteBusinessManager,
  getAllBusinessManagers,
  updateBusinessManager,
} from "../controllers/businessManagersControllers.js";

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

// business manager routes
router.get("/business-managers", verifyToken, getAllBusinessManagers);
router.post("/business-managers/add", verifyToken, addBusinessManager);
router.put(
  "/business-managers/update/:managerId",
  verifyToken,
  updateBusinessManager
);
router.delete(
  "/business-managers/delete/:managerId",
  verifyToken,
  deleteBusinessManager
);

// owners routes end
router.put("/gallery/add", verifyToken, createGallery);
router.get("/gallery", verifyToken, getAllGalleries);
router.get("/gallery/:galleryId", verifyToken, getBusinessGallery);
router.delete("/gallery/:galleryId", verifyToken, deleteBusinessGallery);

router.get("/organizer-details", verifyToken, getOrganizerDetails);
router.patch("/organizer-details/update", verifyToken, updateOrganizerDetails);

export { router as business };
