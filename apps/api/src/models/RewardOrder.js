import mongoose from "mongoose";
import { encryptedString } from "../utils/encryption.js";

const rewardOrderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    variantLabel: { type: String, required: true },
    pointsCost: { type: Number, required: true, min: 1 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const rewardOrderSchema = new mongoose.Schema(
  {
    rewardNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    drop: { type: mongoose.Schema.Types.ObjectId, ref: "RewardDrop" },
    items: [rewardOrderItemSchema],
    totalPoints: { type: Number, required: true, min: 1 },
    deliveryMethod: { type: String, enum: ["pickup", "home"], default: "pickup" },
    pickupGym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym" },
    shippingAddress: {
      label: String,
      street: encryptedString,
      city: encryptedString,
      state: encryptedString,
      zip: encryptedString,
      phone: encryptedString,
    },
    status: {
      type: String,
      enum: ["requested", "preparing", "ready_for_pickup", "in_transit", "delivered", "cancelled"],
      default: "requested",
    },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

export const RewardOrder = mongoose.model("RewardOrder", rewardOrderSchema);
