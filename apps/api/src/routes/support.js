import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { createNotification, notifyAdmins } from "../utils/notifications.js";
import { cleanString, validObjectId } from "../utils/validation.js";
import { writeAuditLog } from "../utils/auditLog.js";

export const supportRouter = Router();

supportRouter.use(requireAuth);

function nextTicketNumber() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `GV-SOP-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function publicTicket(ticket) {
  return {
    _id: ticket._id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    order: ticket.order,
    messages: ticket.messages,
    resolvedAt: ticket.resolvedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

supportRouter.get("/me", async (request, response) => {
  const tickets = await SupportTicket.find({ customer: request.user._id })
    .populate("order", "orderNumber total status paymentStatus")
    .sort({ updatedAt: -1 })
    .limit(40);
  response.json({ tickets: tickets.map(publicTicket) });
});

supportRouter.post("/", async (request, response) => {
  const subject = cleanString(request.body.subject, 140);
  const message = cleanString(request.body.message, 1200);
  const category = ["order", "payment", "return", "account", "gym", "other"].includes(request.body.category)
    ? request.body.category
    : "other";
  const order = validObjectId(request.body.order) ? request.body.order : undefined;

  if (!subject || !message) return response.status(400).json({ message: "Asunto y mensaje son requeridos" });

  const ticket = await SupportTicket.create({
    ticketNumber: nextTicketNumber(),
    customer: request.user._id,
    subject,
    category,
    order,
    messages: [{ author: request.user._id, authorRole: "customer", message }],
  });

  await notifyAdmins({
    title: "Nuevo ticket de soporte",
    message: `${ticket.ticketNumber}: ${ticket.subject}`,
    type: "support",
    linkType: "support",
    linkId: ticket._id,
  });
  await writeAuditLog(request, { action: "support_ticket.create", resource: "support_ticket", resourceId: ticket._id });

  response.status(201).json({ ticket: publicTicket(await ticket.populate("order", "orderNumber total status paymentStatus")) });
});

supportRouter.post("/:id/messages", async (request, response) => {
  const message = cleanString(request.body.message, 1200);
  if (!message) return response.status(400).json({ message: "Escribe un mensaje" });

  const ticket = await SupportTicket.findOne({ _id: request.params.id, customer: request.user._id });
  if (!ticket) return response.status(404).json({ message: "Ticket no encontrado" });
  if (ticket.status === "resolved") return response.status(409).json({ message: "Este ticket ya fue resuelto" });

  ticket.messages.push({ author: request.user._id, authorRole: "customer", message });
  ticket.status = "waiting_team";
  await ticket.save();

  await notifyAdmins({
    title: "Respuesta de cliente",
    message: `${ticket.ticketNumber}: ${ticket.subject}`,
    type: "support",
    linkType: "support",
    linkId: ticket._id,
  });
  response.json({ ticket: publicTicket(await ticket.populate("order", "orderNumber total status paymentStatus")) });
});

supportRouter.patch("/:id/close", async (request, response) => {
  const ticket = await SupportTicket.findOne({ _id: request.params.id, customer: request.user._id });
  if (!ticket) return response.status(404).json({ message: "Ticket no encontrado" });
  ticket.status = "resolved";
  ticket.resolvedAt = new Date();
  await ticket.save();
  response.json({ ticket: publicTicket(ticket) });
});
