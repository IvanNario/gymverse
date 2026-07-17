import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    attributes: { type: Map, of: String, default: {} },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    tags: [{ type: String, trim: true }],
    status: { type: String, enum: ["active", "draft", "archived"], default: "active" },
    pointsEarned: { type: Number, default: 0, min: 0 },
    variants: [variantSchema],
  },
  { timestamps: true }
);

productSchema.virtual("totalStock").get(function totalStock() {
  return this.variants.reduce((sum, variant) => sum + variant.stock, 0);
});

productSchema.set("toJSON", { virtuals: true });

export const Product = mongoose.model("Product", productSchema);
