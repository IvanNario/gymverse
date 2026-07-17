import mongoose from "mongoose";

const productReviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 500 },
    verifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productReviewSchema.index({ product: 1, customer: 1 }, { unique: true });

export const ProductReview = mongoose.model("ProductReview", productReviewSchema);
