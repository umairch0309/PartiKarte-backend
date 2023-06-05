import { Router } from "express";
import { business } from "./business.js";
import { events } from "./events.js";
import { tickets } from "./tickets.js";
import { contact } from "./contact.js";
import { documents } from "./documents.js";
import { auth } from "./auth.routes.js";

const router = Router();

router.use("/business", business);
router.use("/auth", auth);
router.use("/", events);
router.use("/", tickets);
router.use("/", contact);
router.use("/documents", documents);
router.use("/", documents);
export default router;
