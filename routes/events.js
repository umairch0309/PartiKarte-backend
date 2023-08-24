import express from "express";
import verifyToken from "../middlewares/verifyToken.js";

import {
  createNewEvent,
  deleteEvent,
  updateEvent,
  getAllEvents,
  changeEventImage,
  getEvent,
  getAllEventsForCustomer,
  getSingleEventForCustomer,
} from "../controllers/eventControllers.js";

const router = express.Router();

router.get("/events", verifyToken, getAllEvents);
router.get("/all-events-for-customer", getAllEventsForCustomer);
router.get("/all-featured-events-for-customer", getAllEvents);
router.get("/single-event-for-customer/:eventId", getSingleEventForCustomer);

router.get("/events/:eventId", verifyToken, getEvent);

// Create event
router.post("/events/new-event", verifyToken, createNewEvent);
router.put("/events/update-event/:eventId", verifyToken, updateEvent);

router.put("/events/:eventId/upload-image", verifyToken, changeEventImage);

// Delete event
router.delete("/events/delete/:id", verifyToken, deleteEvent);

export { router as events };
