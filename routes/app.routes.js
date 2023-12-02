import express from "express";
import verifyToken from "../middlewares/verifyToken.js";

import {
  signInAsGuest,
  authenticateForApp,
  getAllEventsInApp,
  getEventInApp,
  scanEventInApp,
  markGuestAsPresent,
  getAllGuestsInApp,
} from "../controllers/appControllers.js";

const router = express.Router();

router.post("/guest-signin", signInAsGuest);
router.post("/user-signin", authenticateForApp);

router.get("/all-events", verifyToken, getAllEventsInApp);
router.get("/event/:eventId", verifyToken, getEventInApp);

router.get("/scan-event", scanEventInApp);

router.get("/guests/:eventId", verifyToken, getAllGuestsInApp);
router.get("/present-guests-present/:guestId", verifyToken, markGuestAsPresent);

export { router as app };
