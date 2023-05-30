import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import {
  getTicketById,
  addOrUpdateTicket,
} from "../controllers/ticketController.js";

const router = express.Router();

router.put("/event/:eventId/tickets/:ticketId", verifyToken, addOrUpdateTicket);

router.get(
  "/business/:businessId/event/:eventId/tickets/:ticketId?",
  getTicketById
);

// function calculatePriceWithVAT(price, vatPercentage) {
//     const vat = price * vatPercentage / 100;
//     const priceWithVAT = price + vat;
//     return { vat, priceWithVAT };
// }

export { router as tickets };
