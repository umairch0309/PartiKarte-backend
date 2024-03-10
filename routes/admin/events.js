import express from "express";

import {
  createNewEvent,
  deleteEvent,
  updateEvent,
  getAllEvents,
  changeEventImage,
  getEvent,
  getAllEventsForCustomer,
  getSingleEventForCustomer,
  getActiveEvents,
} from "../../controllers/eventControllers.js";

import verifyAdminToken from "../../middlewares/verifyAdminToken.js";

const router = express.Router();

router.get("/events", verifyAdminToken, getAllEvents);
router.get("/events/active", verifyAdminToken, getActiveEvents);

router.get("/all-events-for-customer", getAllEventsForCustomer);
router.get("/all-featured-events-for-customer", getAllEvents);
router.get("/single-event-for-customer/:eventId", getSingleEventForCustomer);

router.get("/events/:eventId", verifyAdminToken, getEvent);

router.post("/events/new-event", verifyAdminToken, createNewEvent);
router.put("/events/update-event/:eventId", verifyAdminToken, updateEvent);

router.put("/events/:eventId/upload-image", verifyAdminToken, changeEventImage);

router.delete("/events/delete/:id", verifyAdminToken, deleteEvent);

export { router as events };
