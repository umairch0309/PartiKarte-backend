import express from "express";
import verifyToken from "../middlewares/verifyToken.js";

import {
  signInAsGuest,
  authenticateForApp,
  getAllEventsInApp,
  getEventInApp,
  scanEventInApp,
} from "../controllers/appControllers.js";

const router = express.Router();

router.post("/guest-signin", signInAsGuest);
router.post("/user-signin", authenticateForApp);

router.get("/all-events", verifyToken, getAllEventsInApp);
router.get("/event/:eventId", verifyToken, getEventInApp);

router.get("/scan-event", verifyToken, scanEventInApp);

export { router as app };
