import mongoose from "mongoose";

const contentPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    summary: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: { type: String, enum: ["training", "nutrition", "recovery", "lifestyle"], default: "training" },
    level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    readMinutes: { type: Number, default: 4, min: 1 },
    tags: [{ type: String, trim: true }],
    imageUrl: { type: String, default: "", trim: true },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    publishedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const ContentPost = mongoose.model("ContentPost", contentPostSchema);
