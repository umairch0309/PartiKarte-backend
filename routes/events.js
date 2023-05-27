import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { upload } from "../helpers/multerConfig.js";
import verifyToken from "../middlewares/verifyToken.js";

import {
  addorUpdateEvent,
  changeEventImage,
  deleteEvent,
  searchEvents,
  getEventBanner,
} from "../controllers/eventController.js";

dotenv.config();

const router = express.Router();
router.use(bodyParser.json());

// Create event
router.put("/events/:id", verifyToken, addorUpdateEvent);

router.put(
  "/events/:eventId/upload-image",
  upload.single("image"),
  verifyToken,
  changeEventImage
);

// Delete event
router.delete("/events/:id", verifyToken, deleteEvent);

router.post("/events/search", searchEvents);

router.get("/events/eventBanner/:id", getEventBanner);

export { router as events };
