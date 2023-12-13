import express from "express";
import verifyToken from "../middlewares/verifyToken.js";

import {
  createGuest,
  getAllGuests,
  getGuestById,
  updateGuest,
  deleteGuest,
  createMultipleGuests,
  getGuestsSummaryByEvent,
} from "../controllers/guestControllers.js";

const router = express.Router();

router.post("/guests/new-guest", verifyToken, createGuest);
router.post("/guests/multiple-new-guests", verifyToken, createMultipleGuests);
router.get("/guests/:eventId", verifyToken, getAllGuests);
router.get("/guests/summary/:eventId", verifyToken, getGuestsSummaryByEvent);
router.get("/guests/:id", verifyToken, getGuestById);
router.put("/guests/:id", verifyToken, updateGuest);
router.delete("/guests/:id", verifyToken, deleteGuest);

export { router as guests };
