import express from "express";
import {
  createNewTicket,
  deleteTicket,
  getAllTickets,
  getTicket,
  updateTicket,
  updateTicketAppearance,
} from "../../controllers/ticketController.js";
import verifyAdminToken from "../../middlewares/verifyAdminToken.js";

const router = express.Router();

router.get("/event/:eventId/tickets", verifyAdminToken, getAllTickets);

router.get("/event/:eventId/tickets/:ticketId", verifyAdminToken, getTicket);

router.post(
  "/event/:eventId/tickets/new-ticket",
  verifyAdminToken,
  createNewTicket
);

router.put(
  "/event/:eventId/tickets/update/:ticketId",
  verifyAdminToken,
  updateTicket
);

router.put(
  "/event/:eventId/tickets/update-ticket-appearance/:ticketId",
  verifyAdminToken,
  updateTicketAppearance
);

router.delete(
  "/event/:eventId/tickets/:ticketId",
  verifyAdminToken,
  deleteTicket
);

export { router as tickets };
