import mongoose from "mongoose";

const restockGuideItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    variantLabel: { type: String, required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    supplierName: { type: String, default: "Sin proveedor" },
    email: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
  },
  { _id: false }
);

const restockGuideSchema = new mongoose.Schema(
  {
    guideNumber: { type: String, required: true, unique: true },
    items: [restockGuideItemSchema],
    totalItems: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const RestockGuide = mongoose.model("RestockGuide", restockGuideSchema);
