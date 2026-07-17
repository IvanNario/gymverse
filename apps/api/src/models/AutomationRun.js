import mongoose from "mongoose";

const automationRunSchema = new mongoose.Schema(
  {
    rule: { type: String, required: true, trim: true },
    status: { type: String, enum: ["completed", "failed"], default: "completed" },
    summary: { type: String, default: "", trim: true },
    triggeredCount: { type: Number, default: 0, min: 0 },
    changedCount: { type: Number, default: 0, min: 0 },
    details: [
      {
        label: { type: String, default: "", trim: true },
        message: { type: String, default: "", trim: true },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const AutomationRun = mongoose.model("AutomationRun", automationRunSchema);
