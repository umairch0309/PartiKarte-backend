import express from "express";

import {
  updateBusinessInformation,
  updateBusinessContact,
  updateBusinessFinancialInformation,
  updateBusinessMarketingInformation,
  getBusinessGallery,
  createGallery,
  updateProfile,
  setSocialLink,
  deleteSocialLink,
  getAllGalleries,
  deleteBusinessGallery,
  getOrganizerDetails,
  updateOrganizerDetails,
  deleteImageFromGallery,
  setImageAsPreview,
  updateGallery,
  getAllBusinessesForCustomer,
  getSingleBusinessesForCustomer,
} from "../../controllers/businessControllers.js";
import {
  addBusinessManager,
  deleteBusinessManager,
  getAllBusinessManagers,
  updateBusinessManager,
} from "../../controllers/businessManagersControllers.js";

import verifyAdminToken from "../../middlewares/verifyAdminToken.js";

const router = express.Router();

router.put("/information", verifyAdminToken, updateBusinessInformation);
router.put("/contact-information", verifyAdminToken, updateBusinessContact);
router.put(
  "/financial-information",
  verifyAdminToken,
  updateBusinessFinancialInformation
);
router.put(
  "/marketing-information",
  verifyAdminToken,
  updateBusinessMarketingInformation
);
router.put("/update-profile", verifyAdminToken, updateProfile);

router.put("/set-social-link", verifyAdminToken, setSocialLink);
router.delete(
  "/delete-social-link/:platform",
  verifyAdminToken,
  deleteSocialLink
);

// business manager routes
router.get("/business-managers", verifyAdminToken, getAllBusinessManagers);
router.post("/business-managers/add", verifyAdminToken, addBusinessManager);
router.put(
  "/business-managers/update/:managerId",
  verifyAdminToken,
  updateBusinessManager
);
router.delete(
  "/business-managers/delete/:managerId",
  verifyAdminToken,
  deleteBusinessManager
);

// owners routes end
router.put("/gallery/add", verifyAdminToken, createGallery);
router.put("/gallery/update/:galleryId", verifyAdminToken, updateGallery);
router.get("/gallery", verifyAdminToken, getAllGalleries);
router.get("/gallery/:galleryId", verifyAdminToken, getBusinessGallery);
router.delete("/gallery/:galleryId", verifyAdminToken, deleteBusinessGallery);
router.delete(
  "/gallery/:galleryId/image/:imageId",
  verifyAdminToken,
  deleteImageFromGallery
);
router.patch(
  "/gallery/:galleryId/image/:imageId",
  verifyAdminToken,
  setImageAsPreview
);

router.get("/organizer-details", verifyAdminToken, getOrganizerDetails);
router.patch(
  "/organizer-details/update",
  verifyAdminToken,
  updateOrganizerDetails
);

router.get("/businesses-for-customer", getAllBusinessesForCustomer);
router.get(
  "/business-for-customer/:businessId",
  getSingleBusinessesForCustomer
);

export { router as business };
