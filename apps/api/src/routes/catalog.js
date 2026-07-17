import { Router } from "express";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Gym } from "../models/Gym.js";
import { GymStock } from "../models/GymStock.js";
import { RewardDrop } from "../models/RewardDrop.js";
import { Order } from "../models/Order.js";
import { ProductReview } from "../models/ProductReview.js";
import { Coupon } from "../models/Coupon.js";
import { ContentPost } from "../models/ContentPost.js";
import { requireAuth } from "../middleware/auth.js";
import { cleanString, escapeRegExp, validObjectId } from "../utils/validation.js";
import { ensureDefaultLegalDocuments } from "../utils/legalDocuments.js";
import { publicUserProfile } from "../utils/privacy.js";

export const catalogRouter = Router();

catalogRouter.get("/categories", async (_request, response) => {
  const categories = await Category.find({ active: true }).sort({ name: 1 });
  response.json({ categories });
});

export async function categoryFilterFor(value) {
  const category = cleanString(value, 80);
  if (!category || category === "all") return {};
  const match = validObjectId(category)
    ? await Category.findOne({ _id: category, active: true }).select("_id")
    : await Category.findOne({
        active: true,
        $or: [
          { slug: category.toLowerCase() },
          { name: new RegExp(`^${escapeRegExp(category)}$`, "i") },
        ],
      }).select("_id");
  if (!match) return null;
  return { category: match._id };
}

catalogRouter.get("/products", async (request, response) => {
  const search = cleanString(request.query.search, 80);
  const filter = { status: "active" };

  const categoryFilter = await categoryFilterFor(request.query.category);
  if (categoryFilter === null) return response.json({ products: [] });
  Object.assign(filter, categoryFilter);

  if (search) {
    const pattern = new RegExp(escapeRegExp(search), "i");
    filter.$or = [
      { name: pattern },
      { description: pattern },
      { tags: pattern },
    ];
  }

  const products = await Product.find(filter).populate("category supplier").sort({ createdAt: -1 });
  response.json({ products });
});

catalogRouter.get("/products/:slug", async (request, response) => {
  const product = await Product.findOne({ slug: request.params.slug, status: "active" }).populate("category supplier");
  if (!product) return response.status(404).json({ message: "Producto no encontrado" });
  response.json({ product });
});

catalogRouter.get("/products/:id/reviews", async (request, response) => {
  if (!validObjectId(request.params.id)) return response.status(400).json({ message: "Producto inválido" });
  const reviews = await ProductReview.find({ product: request.params.id })
    .populate("customer", "name")
    .sort({ createdAt: -1 })
    .limit(50);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  response.json({ reviews, average: Math.round(average * 10) / 10, total: reviews.length });
});

catalogRouter.post("/products/:id/reviews", requireAuth, async (request, response) => {
  if (!validObjectId(request.params.id)) return response.status(400).json({ message: "Producto inválido" });
  const product = await Product.findOne({ _id: request.params.id, status: "active" }).select("_id");
  if (!product) return response.status(404).json({ message: "Producto no encontrado" });

  const rating = Number(request.body.rating || 0);
  const comment = cleanString(request.body.comment, 500);
  if (rating < 1 || rating > 5) return response.status(400).json({ message: "Calificación inválida" });
  if (comment.length < 8) return response.status(400).json({ message: "Escribe una reseña un poco más completa" });

  const verifiedPurchase = await Order.exists({
    customer: request.user._id,
    status: "delivered",
    "items.product": product._id,
  });

  const review = await ProductReview.findOneAndUpdate(
    { product: product._id, customer: request.user._id },
    { rating, comment, verifiedPurchase: Boolean(verifiedPurchase) },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate("customer", "name");

  response.status(201).json({ review });
});

catalogRouter.get("/gyms", async (_request, response) => {
  const gyms = await Gym.find({ status: "active", pickupEnabled: true }).sort({ name: 1 });
  response.json({ gyms });
});

catalogRouter.get("/gyms/search", requireAuth, async (request, response) => {
  const query = cleanString(request.query.query || request.query.q, 80);
  if (query.length < 2) return response.json({ gyms: [] });

  const normalizedQuery = query.toLowerCase();
  const candidates = await Gym.find({ status: "active", pickupEnabled: true })
    .sort({ name: 1 })
    .limit(200);
  const gyms = candidates
    .filter((gym) =>
      [gym.name, gym.code, gym.city, gym.address].some((value) => String(value || "").toLowerCase().includes(normalizedQuery))
    )
    .slice(0, 12);

  response.json({ gyms });
});

catalogRouter.get("/my-gyms", requireAuth, async (request, response) => {
  const gyms = await Gym.find({
    _id: { $in: request.user.affiliatedGyms || [] },
    status: "active",
    pickupEnabled: true,
  }).sort({ name: 1 });

  response.json({ gyms });
});

catalogRouter.get("/my-gyms/:id/stock", requireAuth, async (request, response) => {
  if (!validObjectId(request.params.id)) return response.status(400).json({ message: "Gimnasio inválido" });
  const affiliated = (request.user.affiliatedGyms || []).some((gym) => gym.toString() === request.params.id);
  if (!affiliated) return response.status(403).json({ message: "Este gimnasio no está afiliado a tu cuenta" });
  const stock = await GymStock.find({ gym: request.params.id, quantity: { $gt: 0 } }).select("product sku quantity updatedAt");
  response.json({ stock });
});

catalogRouter.post("/my-gyms/:id", requireAuth, async (request, response) => {
  if (!validObjectId(request.params.id)) return response.status(400).json({ message: "Gimnasio inválido" });

  const gym = await Gym.findOne({ _id: request.params.id, status: "active", pickupEnabled: true });
  if (!gym) return response.status(404).json({ message: "Gimnasio no disponible para retiro" });

  request.user.affiliatedGyms = [...new Set([...(request.user.affiliatedGyms || []).map(String), gym._id.toString()])];
  await request.user.save();

  const gyms = await Gym.find({ _id: { $in: request.user.affiliatedGyms }, status: "active", pickupEnabled: true }).sort({ name: 1 });
  response.status(201).json({ gyms, user: publicUserProfile(request.user, { includePrivate: true }) });
});

catalogRouter.delete("/my-gyms/:id", requireAuth, async (request, response) => {
  if (!validObjectId(request.params.id)) return response.status(400).json({ message: "Gimnasio inválido" });

  request.user.affiliatedGyms = (request.user.affiliatedGyms || []).filter((gym) => gym.toString() !== request.params.id);
  await request.user.save();

  const gyms = await Gym.find({ _id: { $in: request.user.affiliatedGyms }, status: "active", pickupEnabled: true }).sort({ name: 1 });
  response.json({ gyms, user: publicUserProfile(request.user, { includePrivate: true }) });
});

catalogRouter.get("/reward-drop", async (_request, response) => {
  const now = new Date();
  const drop = await RewardDrop.findOne({
    status: "active",
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  })
    .populate({ path: "items.product", populate: "category supplier" })
    .sort({ updatedAt: -1 });
  response.json({ drop });
});

catalogRouter.get("/promotions", async (_request, response) => {
  const now = new Date();
  const promotions = await Coupon.find({
    active: true,
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  })
    .sort({ updatedAt: -1 })
    .limit(5);
  response.json({ promotions });
});

catalogRouter.get("/legal", async (_request, response) => {
  const documents = await ensureDefaultLegalDocuments();
  response.json({ documents: documents.filter((document) => document.status === "published") });
});

catalogRouter.get("/content", async (request, response) => {
  const type = cleanString(request.query.type, 40);
  const filter = { status: "published" };
  if (type && type !== "all") filter.type = type;

  const posts = await ContentPost.find(filter)
    .populate("relatedProducts", "name slug imageUrl variants")
    .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
    .limit(24);
  response.json({ posts });
});

catalogRouter.get("/content/:slug", async (request, response) => {
  const post = await ContentPost.findOne({ slug: request.params.slug, status: "published" }).populate(
    "relatedProducts",
    "name slug imageUrl variants"
  );
  if (!post) return response.status(404).json({ message: "Contenido no encontrado" });
  response.json({ post });
});
