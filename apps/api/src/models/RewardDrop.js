import mongoose from "mongoose";

const rewardDropItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    pointsCost: { type: Number, required: true, min: 1 },
    stock: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const rewardDropSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "" },
    bannerText: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    status: { type: String, enum: ["draft", "active", "archived"], default: "draft" },
    startsAt: { type: Date },
    endsAt: { type: Date },
    items: [rewardDropItemSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const RewardDrop = mongoose.model("RewardDrop", rewardDropSchema);
