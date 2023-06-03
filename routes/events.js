import express from "express";
import { upload } from "../helpers/multerConfig.js";
import verifyToken from "../middlewares/verifyToken.js";

import {
  createNewEvent,
  deleteEvent,
  updateEvent,
  getAllEvents,
  changeEventImage,
} from "../controllers/eventControllers.js";

const router = express.Router();

router.get("/events", verifyToken, getAllEvents);

// Create event
router.post("/events/new-event", verifyToken, createNewEvent);
router.put("/events/update-event/:eventId", verifyToken, updateEvent);

router.put(
  "/events/:eventId/upload-image",
  upload.single("image"),
  verifyToken,
  changeEventImage
);

// Delete event
router.delete("/events/delete/:id", verifyToken, deleteEvent);

export { router as events };
