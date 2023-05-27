import businessUser from "../models/businessUser.js";
import ticketCode from "../models/ticketCode.js";
import { calculatePriceWithVAT } from "../helpers/helpers.js";

/**
 * @method  getTicketById
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns gets ticket by Ticket Id
 */
export const getTicketById = async (req, res) => {
  try {
    const { businessId, eventId, ticketId } = req.params;

    const user = await businessUser.findById(businessId);
    if (!user) {
      return res.status(404).json({ message: "businessUser not found" });
    }

    const event = user.events.id(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (ticketId) {
      const ticket = event.tickets.id(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      return res.status(200).json(ticket);
    }

    res.status(200).json(event.tickets);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tickets", error });
  }
};

/**
 * @method  addOrUpdateTicket
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns Adds and Updates Ticket
 */
export const addOrUpdateTicket = async (req, res) => {
  const userId = req.userId;
  const eventId = req.params.eventId;
  const ticketId = req.params.ticketId;

  const {
    ticketName,
    dateStart,
    dateEnd,
    maxCapacity,
    price,
    vatPercentage,
    description,
  } = req.body;
  const inventory = maxCapacity;
  const { vat, priceWithVAT } = calculatePriceWithVAT(price, vatPercentage);

  try {
    const user = await businessUser.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const event = user.events.id(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    let ticket;
    if (ticketId === "new") {
      const newTicket = {
        ticketName,
        dateStart,
        dateEnd,
        maxCapacity,
        price,
        vatPercentage,
        vat,
        priceWithVAT,
        description,
        inventory,
      };

      event.tickets.push(newTicket);
      await user.save();
      ticket = event.tickets[event.tickets.length - 1];

      var ticketIdInsert = ticket._id;

      await ticketCode.findOneAndUpdate(
        { event: eventId },
        {
          $push: {
            tickets: {
              ticketName: ticketName,
              ticketId: ticketIdInsert,
              codes: [],
            },
          },
        },
        { new: true }
      );
    } else {
      ticket = event.tickets.id(ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      ticket.set({
        ticketName,
        dateStart,
        dateEnd,
        maxCapacity,
        price,
        vatPercentage,
        vat,
        priceWithVAT,
        description,
        inventory,
      });
      await user.save();

      if (ticketId !== "new") {
        await ticketCode.findOneAndUpdate(
          { event: eventId, "tickets.ticketId": ticketId },
          { $set: { "tickets.$.ticketName": ticketName } }
        );
      }
    }

    res.status(200).json({ message: "Ticket updated", ticketId: ticket._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
