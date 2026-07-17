import mongoose from "mongoose";

const returnRequestSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, required: true, unique: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, trim: true },
    resolutionNote: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected", "received", "refunded"],
      default: "requested",
    },
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: Date,
  },
  { timestamps: true }
);

returnRequestSchema.index({ order: 1 }, { unique: true });

export const ReturnRequest = mongoose.model("ReturnRequest", returnRequestSchema);
