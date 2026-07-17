import mongoose from "mongoose";

const ticketMessageSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorRole: { type: String, enum: ["customer", "admin", "staff"], default: "customer" },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, trim: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["order", "payment", "return", "account", "gym", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["open", "waiting_customer", "waiting_team", "resolved"],
      default: "open",
    },
    priority: { type: String, enum: ["low", "normal", "high"], default: "normal" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    messages: [ticketMessageSchema],
    resolvedAt: Date,
  },
  { timestamps: true }
);

export const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
