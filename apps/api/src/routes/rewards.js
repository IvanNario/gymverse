import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Gym } from "../models/Gym.js";
import { Product } from "../models/Product.js";
import { RewardDrop } from "../models/RewardDrop.js";
import { RewardOrder } from "../models/RewardOrder.js";
import { createRewardNumber } from "../utils/orders.js";
import { cleanString, positiveInt, validObjectId } from "../utils/validation.js";
import { privateAddress, publicAddress, publicUserProfile } from "../utils/privacy.js";
import { conflict, withTransaction } from "../utils/concurrency.js";

export const rewardsRouter = Router();

function userAffiliatedGymIds(user) {
  return new Set((user.affiliatedGyms || []).map((gym) => gym._id?.toString?.() || gym.toString()));
}

function publicRewardOrder(order, { viewer }) {
  const json = order?.toJSON ? order.toJSON() : order;
  return {
    ...json,
    shippingAddress: viewer?.role === "admin" || viewer?._id?.toString?.() === json.customer?.toString?.() ? privateAddress(json.shippingAddress) : publicAddress(json.shippingAddress),
  };
}

rewardsRouter.get("/me", requireAuth, async (request, response) => {
  const rewardOrders = await RewardOrder.find({ customer: request.user._id })
    .populate("pickupGym")
    .sort({ createdAt: -1 })
    .limit(50);
  response.json({ rewardOrders: rewardOrders.map((order) => publicRewardOrder(order, { viewer: request.user })) });
});

rewardsRouter.post("/redeem", requireAuth, async (request, response) => {
  const { dropId, itemId, quantity = 1, deliveryMethod = "pickup", pickupGym, shippingAddress } = request.body;
  const amount = positiveInt(quantity, { min: 1, max: 5 });
  if (!amount) return response.status(400).json({ message: "Cantidad inválida" });
  if (!["pickup", "home"].includes(deliveryMethod)) return response.status(400).json({ message: "Método de entrega inválido" });
  if (!validObjectId(dropId)) return response.status(400).json({ message: "Drop inválido" });
  const drop = await RewardDrop.findOne({ _id: dropId, status: "active" });
  if (!drop) return response.status(404).json({ message: "Drop no disponible" });

  const item = drop.items.id(itemId);
  if (!item || !item.active) return response.status(404).json({ message: "Producto de recompensa no disponible" });
  if (item.stock < amount) return response.status(409).json({ message: "Stock insuficiente en el drop" });

  const product = await Product.findById(item.product);
  if (!product || product.status !== "active") return response.status(404).json({ message: "Producto no disponible" });
  const variant = product.variants.find((entry) => entry.sku === item.sku);
  if (!variant) return response.status(404).json({ message: "Variante no disponible" });
  if (variant.stock < amount) return response.status(409).json({ message: `Stock insuficiente para ${product.name}` });

  const totalPoints = item.pointsCost * amount;
  if ((request.user.points || 0) < totalPoints) return response.status(409).json({ message: "Puntos insuficientes" });

  let gym = null;
  if (deliveryMethod === "pickup") {
    if (!validObjectId(pickupGym)) return response.status(400).json({ message: "Gimnasio de retiro inválido" });
    if (!userAffiliatedGymIds(request.user).has(String(pickupGym))) {
      return response.status(403).json({ message: "Primero afilia este gimnasio desde tu perfil" });
    }
    gym = await Gym.findById(pickupGym);
    if (!gym || gym.status !== "active" || !gym.pickupEnabled) return response.status(400).json({ message: "Gimnasio de retiro inválido" });
  }
  if (deliveryMethod === "home") {
    const address = shippingAddress || {};
    if (!address.street || !address.city || !address.state || !address.zip || !address.phone) {
      return response.status(400).json({ message: "Dirección de envío incompleta" });
    }
  }

  const rewardOrder = await withTransaction(async (session) => {
    const dropResult = await RewardDrop.updateOne(
      { _id: drop._id, status: "active", items: { $elemMatch: { _id: item._id, active: true, stock: { $gte: amount } } } },
      { $inc: { "items.$.stock": -amount } },
      { session }
    );
    if (!dropResult.modifiedCount) throw conflict("Stock insuficiente en el drop");

    const productResult = await Product.updateOne(
      { _id: product._id, status: "active", variants: { $elemMatch: { sku: item.sku, stock: { $gte: amount } } } },
      { $inc: { "variants.$.stock": -amount } },
      { session }
    );
    if (!productResult.modifiedCount) throw conflict(`Stock insuficiente para ${product.name}`);

    const pointsResult = await request.user.constructor.updateOne(
      { _id: request.user._id, points: { $gte: totalPoints } },
      { $inc: { points: -totalPoints } },
      { session }
    );
    if (!pointsResult.modifiedCount) throw conflict("Puntos insuficientes");

    const created = await RewardOrder.create(
      [
        {
          rewardNumber: createRewardNumber(),
          customer: request.user._id,
          drop: drop._id,
          items: [
            {
              product: product._id,
              productName: product.name,
              sku: variant.sku,
              variantLabel: variant.label,
              pointsCost: item.pointsCost,
              quantity: amount,
            },
          ],
          totalPoints,
          deliveryMethod,
          pickupGym: gym?._id,
          shippingAddress:
            deliveryMethod === "home"
              ? {
                  label: cleanString(shippingAddress.label || "Envío", 80),
                  street: cleanString(shippingAddress.street, 180),
                  city: cleanString(shippingAddress.city, 90),
                  state: cleanString(shippingAddress.state, 90),
                  zip: cleanString(shippingAddress.zip, 20),
                  phone: cleanString(shippingAddress.phone, 30),
                }
              : undefined,
        },
      ],
      { session }
    );
    return created[0];
  });

  const updatedUser = await request.user.constructor.findById(request.user._id);
  await rewardOrder.populate("pickupGym");
  response.status(201).json({
    rewardOrder: publicRewardOrder(rewardOrder, { viewer: request.user }),
    user: publicUserProfile(updatedUser, { includePrivate: true }),
  });
});
