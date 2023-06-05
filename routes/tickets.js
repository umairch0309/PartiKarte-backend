import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import {
  createNewTicket,
  deleteTicket,
  getAllTickets,
  updateTicket,
} from "../controllers/ticketController.js";

const router = express.Router();

router.get("/event/:eventId/tickets", verifyToken, getAllTickets);

router.post("/event/:eventId/tickets/new-ticket", verifyToken, createNewTicket);

router.put("/event/:eventId/tickets/:ticketId", verifyToken, updateTicket);

router.delete("/event/:eventId/tickets/:ticketId", verifyToken, deleteTicket);

router.get(
  "/business/:businessId/event/:eventId/tickets/:ticketId?",
  async () => {}
);

export { router as tickets };
