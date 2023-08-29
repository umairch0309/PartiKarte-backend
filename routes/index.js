import { Router } from "express";
import { business } from "./business.js";
import { events } from "./events.js";
import { tickets } from "./tickets.js";
import { contact } from "./contact.js";
import { documents } from "./documents.js";
import { auth } from "./auth.routes.js";
import { news } from "./news.js";
import { orders } from "./orders.js";
import { guests } from "./guests.js";
const router = Router();

router.use("/business", business);
router.use("/", orders);
router.use("/auth", auth);
router.use("/", news);
router.use("/", events);
router.use("/", tickets);
router.use("/", guests);

router.use("/", contact);
router.use("/documents", documents);
export default router;
