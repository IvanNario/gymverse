import mongoose from "mongoose";

const legalBlockSchema = new mongoose.Schema(
  {
    heading: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const legalDocumentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    intro: { type: String, required: true, trim: true },
    status: { type: String, enum: ["draft", "published"], default: "published" },
    versionLabel: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 },
    blocks: [legalBlockSchema],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const LegalDocument = mongoose.model("LegalDocument", legalDocumentSchema);
