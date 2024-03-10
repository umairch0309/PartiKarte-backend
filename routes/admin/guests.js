import express from "express";

import {
  createGuest,
  getAllGuests,
  getGuestById,
  updateGuest,
  deleteGuest,
  createMultipleGuests,
  getGuestsSummaryByEvent,
} from "../../controllers/guestControllers.js";
import verifyAdminToken from "../../middlewares/verifyAdminToken.js";

const router = express.Router();

router.post("/guests/new-guest", verifyAdminToken, createGuest);
router.post(
  "/guests/multiple-new-guests",
  verifyAdminToken,
  createMultipleGuests
);
router.get("/guests/:eventId", verifyAdminToken, getAllGuests);
router.get(
  "/guests/summary/:eventId",
  verifyAdminToken,
  getGuestsSummaryByEvent
);
router.get("/guests/:id", verifyAdminToken, getGuestById);
router.put("/guests/:id", verifyAdminToken, updateGuest);
router.delete("/guests/:id", verifyAdminToken, deleteGuest);

export { router as guests };
