import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import {
  createNewTicket,
  deleteTicket,
  getAllTickets,
  getTicket,
  updateTicket,
} from "../controllers/ticketController.js";

const router = express.Router();

router.get("/event/:eventId/tickets", verifyToken, getAllTickets);

router.get("/event/:eventId/tickets/:ticketId", verifyToken, getTicket);

router.post("/event/:eventId/tickets/new-ticket", verifyToken, createNewTicket);

router.put(
  "/event/:eventId/tickets/update/:ticketId",
  verifyToken,
  updateTicket
);

router.delete("/event/:eventId/tickets/:ticketId", verifyToken, deleteTicket);

export { router as tickets };
