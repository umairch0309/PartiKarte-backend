import express from "express";
import verifyToken from "../middlewares/verifyToken.js";

import {
  createGuest,
  getAllGuests,
  getGuestById,
  updateGuest,
  deleteGuest,
} from "../controllers/guestControllers.js";

const router = express.Router();

router.post("/guests/new-guest", verifyToken, createGuest);
router.get("/guests/:eventId", verifyToken, getAllGuests);
router.get("/guests/:id", verifyToken, getGuestById);
router.put("/guests/:id", verifyToken, updateGuest);
router.delete("/guests/:id", verifyToken, deleteGuest);

export { router as guests };
