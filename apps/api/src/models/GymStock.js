import mongoose from "mongoose";

const gymStockSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    variantLabel: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 0, min: 0, max: 10 },
  },
  { timestamps: true }
);

gymStockSchema.index({ gym: 1, product: 1, sku: 1 }, { unique: true });

export const GymStock = mongoose.model("GymStock", gymStockSchema);
