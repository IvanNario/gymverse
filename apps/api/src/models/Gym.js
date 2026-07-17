import mongoose from "mongoose";
import { encryptedString } from "../utils/encryption.js";

const gymSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    address: { ...encryptedString, required: true },
    city: { ...encryptedString, required: true },
    phone: { ...encryptedString, default: "" },
    pickupEnabled: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "paused", "archived"], default: "active" },
    capacity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    membershipFee: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: ["pending", "paid", "overdue"], default: "pending" },
    lastPaymentAt: { type: Date },
    nextPaymentDue: { type: Date },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

export const Gym = mongoose.model("Gym", gymSchema);
