import mongoose from "mongoose";

const gymRestockRequestItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    variantLabel: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, max: 10 },
    currentStock: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const gymRestockRequestSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, required: true, unique: true },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    items: [gymRestockRequestItemSchema],
    status: { type: String, enum: ["requested", "transferred", "cancelled"], default: "requested" },
    note: { type: String, default: "", trim: true },
    adminNote: { type: String, default: "", trim: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    confirmedAt: Date,
  },
  { timestamps: true }
);

export const GymRestockRequest = mongoose.model("GymRestockRequest", gymRestockRequestSchema);
