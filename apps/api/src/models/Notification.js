import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: { type: String, enum: ["admin", "staff", "gym", "customer"] },
    noticeCode: { type: String, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, default: "info", trim: true },
    linkType: { type: String, trim: true },
    linkId: { type: mongoose.Schema.Types.ObjectId },
    readAt: Date,
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    clearedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
