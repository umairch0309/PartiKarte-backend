import { Router } from "express";
import { businessUsers } from "./business-users.js";
import { events } from "./events.js";
import { tickets } from "./tickets.js";
import { contact } from "./contact.js";
import { documents } from "./documents.js";

const router = Router();

router.use("/business", businessUsers);
router.use("/", events);
router.use("/tickets", tickets);
router.use("/", contact);
router.use("/documents", documents);
router.use("/", documents);
export default router;