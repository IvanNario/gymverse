import mongoose from "mongoose";
import { encryptedString } from "../utils/encryption.js";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    variantLabel: { type: String, required: true },
    price: { type: Number, required: true },
    cost: { type: Number, default: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountCode: { type: String, trim: true },
    total: { type: Number, required: true },
    pointsEarned: { type: Number, default: 0 },
    deliveryMethod: { type: String, enum: ["pickup", "home"], required: true },
    pickupGym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym" },
    pickupCode: { type: String, trim: true },
    deliveredAt: Date,
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
      enum: ["pending_payment", "paid", "preparing", "ready_for_pickup", "in_transit", "delivered", "cancelled", "returned"],
      default: "paid",
    },
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "paid" },
    paymentMethod: { type: String, enum: ["card", "pickup", "mercado_pago"], default: "mercado_pago" },
    paymentProvider: { type: String, enum: ["demo_card", "pickup", "mercado_pago"], default: "mercado_pago" },
    providerPreferenceId: String,
    providerPaymentId: String,
    providerStatus: String,
    paymentUrl: String,
    paymentExpiresAt: Date,
    stockRestoredAt: Date,
    adminArchivedAt: Date,
    paidAt: Date,
    pointsGrantedAt: Date,
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

export const Order = mongoose.model("Order", orderSchema);
