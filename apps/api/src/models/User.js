import mongoose from "mongoose";
import { encryptedString } from "../utils/encryption.js";

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    street: { ...encryptedString, required: true },
    city: { ...encryptedString, required: true },
    state: { ...encryptedString, required: true },
    zip: { ...encryptedString, required: true },
    phone: { ...encryptedString, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: encryptedString,
    passwordHash: { type: String, required: true },
    authProvider: { type: String, enum: ["password", "google", "mixed"], default: "password" },
    googleSubject: { type: String, unique: true, sparse: true, trim: true },
    passwordResetCodeHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordResetAttempts: { type: Number, default: 0, select: false },
    role: { type: String, enum: ["customer", "admin", "staff", "gym"], default: "customer" },
    adminRolePreset: { type: String, default: "" },
    permissions: [{ type: String }],
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym" },
    affiliatedGyms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Gym" }],
    addresses: [addressSchema],
    hiddenOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    points: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

export const User = mongoose.model("User", userSchema);
