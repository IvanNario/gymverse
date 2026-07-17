import mongoose from "mongoose";
import { encryptedString } from "../utils/encryption.js";

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    contactName: { ...encryptedString, default: "" },
    email: { ...encryptedString, default: "" },
    phone: { ...encryptedString, default: "" },
    status: { type: String, enum: ["active", "paused", "archived"], default: "active" },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

export const Supplier = mongoose.model("Supplier", supplierSchema);
