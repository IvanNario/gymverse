import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Gym } from "../models/Gym.js";
import { Coupon } from "../models/Coupon.js";
import { ReturnRequest } from "../models/ReturnRequest.js";
import { User } from "../models/User.js";
import { GymStock } from "../models/GymStock.js";
import { GymRestockRequest } from "../models/GymRestockRequest.js";
import { createGymRestockNumber, createOrderNumber, createPickupCode, createReturnNumber } from "../utils/orders.js";
import { createSimplePdf } from "../utils/pdf.js";
import { createNotification, notifyAdmins } from "../utils/notifications.js";
import { cleanString, positiveInt, validObjectId } from "../utils/validation.js";
import { createPaymentPreference, getPayment, isMercadoPagoConfigured, paymentPreferenceUrl, paymentStatusFromMercadoPago } from "../utils/mercadoPago.js";
import { hasAdminPermission } from "../utils/adminPermissions.js";
import { publicOrder } from "../utils/privacy.js";
import { writeAuditLog } from "../utils/auditLog.js";
import { env } from "../config/env.js";
import { conflict, withTransaction } from "../utils/concurrency.js";

export const ordersRouter = Router();
const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

function requireOrdersPanelAccess(request, response, next) {
  if (request.user.role === "admin" || request.user.role === "gym" || hasAdminPermission(request.user, "orders")) {
    return next();
  }
  return response.status(403).json({ message: "No tienes acceso a pedidos" });
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function normalizeCouponCode(code = "") {
  return String(code).trim().toUpperCase();
}

function paymentDeadlineFrom(date = new Date()) {
  return new Date(new Date(date).getTime() + PAYMENT_WINDOW_MS);
}

function effectivePaymentDeadline(order) {
  return order.paymentExpiresAt || paymentDeadlineFrom(order.createdAt || new Date());
}

function userAffiliatedGymIds(user) {
  return new Set((user.affiliatedGyms || []).map((gym) => gym._id?.toString?.() || gym.toString()));
}

async function getValidCoupon(code, subtotal) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;

  const now = new Date();
  const coupon = await Coupon.findOne({ code: normalized, active: true });
  if (!coupon) return { message: "Cupón no válido" };
  if (coupon.startsAt && coupon.startsAt > now) return { message: "Este cupón aún no está disponible" };
  if (coupon.endsAt && coupon.endsAt < now) return { message: "Este cupón ya venció" };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { message: "Este cupón ya alcanzó su límite" };
  if (subtotal < coupon.minSubtotal) {
    return { message: `Este cupón aplica desde ${formatMoney(coupon.minSubtotal)}` };
  }

  return coupon;
}

async function grantOrderPointsOnce(order) {
  if (!order?.pointsEarned || order.pointsEarned <= 0) return false;
  return withTransaction(async (session) => {
    const result = await Order.updateOne(
      { _id: order._id, pointsGrantedAt: { $exists: false } },
      { $set: { pointsGrantedAt: new Date() } },
      { session }
    );
    if (!result.modifiedCount) return false;
    await User.updateOne({ _id: order.customer }, { $inc: { points: order.pointsEarned } }, { session });
    return true;
  });
}

function calculateCouponDiscount(coupon, subtotal, shippingFee) {
  if (!coupon) return { discount: 0, shippingFee };
  if (coupon.type === "free_shipping") {
    return { discount: 0, shippingFee: 0 };
  }

  const rawDiscount = coupon.type === "percentage" ? subtotal * (coupon.value / 100) : coupon.value;
  const cappedDiscount = coupon.maxDiscount ? Math.min(rawDiscount, coupon.maxDiscount) : rawDiscount;
  return { discount: Math.min(subtotal, Math.round(cappedDiscount * 100) / 100), shippingFee };
}

async function updateOrderFromMercadoPagoPayment(payment) {
  const orderId = payment.external_reference || payment.metadata?.order_id;
  if (!validObjectId(orderId)) return null;

  const order = await Order.findById(orderId);
  if (!order) return null;

  const wasPaid = order.paymentStatus === "paid";
  const paymentStatus = paymentStatusFromMercadoPago(payment.status);
  order.paymentStatus = paymentStatus;
  order.providerPaymentId = String(payment.id || order.providerPaymentId || "");
  order.providerStatus = String(payment.status || "");
  if (paymentStatus === "paid" && order.status !== "cancelled") {
    order.status = order.status === "pending_payment" ? "preparing" : order.status;
    order.paidAt = new Date(payment.date_approved || Date.now());
    if (!wasPaid) await grantOrderPointsOnce(order);
  }
  if (paymentStatus === "refunded") {
    order.status = "returned";
  }
  await order.save();

  await createNotification({
    recipient: order.customer,
    title: paymentStatus === "paid" ? "Pago aprobado" : "Pago actualizado",
    message: `${order.orderNumber} ahora tiene pago ${paymentStatus}.`,
    type: "payment",
    linkType: "order",
    linkId: order._id,
  });

  return order;
}

async function restoreOrderStock(order, session = null) {
  if (order.stockRestoredAt) return false;
  for (const item of order.items || []) {
    if (order.deliveryMethod === "pickup" && order.pickupGym) {
      await GymStock.updateOne(
        { gym: order.pickupGym, product: item.product, sku: item.sku },
        {
          $setOnInsert: {
            gym: order.pickupGym,
            product: item.product,
            productName: item.productName,
            sku: item.sku,
            variantLabel: item.variantLabel,
          },
          $inc: { quantity: Number(item.quantity || 0) },
        },
        { session, upsert: true }
      );
      await GymStock.updateOne(
        { gym: order.pickupGym, product: item.product, sku: item.sku, quantity: { $gt: 10 } },
        { $set: { quantity: 10 } },
        { session }
      );
    } else {
      await Product.updateOne(
        { _id: item.product, "variants.sku": item.sku },
        { $inc: { "variants.$.stock": Number(item.quantity || 0) } },
        { session }
      );
    }
  }
  order.stockRestoredAt = new Date();
  return true;
}

async function releaseCouponUsage(order, session = null) {
  if (!order.discountCode) return;
  await Coupon.updateOne({ code: order.discountCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
}

async function cancelOrderWithRestock(order, reason = "cancelled") {
  const cancelled = await withTransaction(async (session) => {
    const freshOrder = await Order.findById(order._id).session(session);
    if (!freshOrder) return null;
    const wasCancelled = freshOrder.status === "cancelled";
    if (!wasCancelled) {
      freshOrder.status = "cancelled";
      if (freshOrder.paymentStatus !== "paid") freshOrder.paymentStatus = "pending";
      await restoreOrderStock(freshOrder, session);
      await releaseCouponUsage(freshOrder, session);
    }
    await freshOrder.save({ session });
    return freshOrder;
  });
  if (!cancelled) return order;
  if (reason === "expired") {
    await createNotification({
      recipient: cancelled.customer,
      title: "Pedido cancelado",
      message: `${cancelled.orderNumber} se canceló porque pasaron 24 horas sin pago.`,
      type: "payment",
      linkType: "order",
      linkId: cancelled._id,
    });
  }
  return cancelled;
}

async function expirePendingOrderIfNeeded(order) {
  if (
    order?.status === "pending_payment" &&
    order.paymentStatus === "pending" &&
    effectivePaymentDeadline(order) <= new Date()
  ) {
    return cancelOrderWithRestock(order, "expired");
  }
  return order;
}

async function expirePendingOrders(filter = {}) {
  const expired = await Order.find({
    ...filter,
    status: "pending_payment",
    paymentStatus: "pending",
    $or: [
      { paymentExpiresAt: { $lte: new Date() } },
      { paymentExpiresAt: { $exists: false }, createdAt: { $lte: new Date(Date.now() - PAYMENT_WINDOW_MS) } },
    ],
  }).limit(50);
  for (const order of expired) {
    await cancelOrderWithRestock(order, "expired");
  }
}

ordersRouter.get("/me", requireAuth, async (request, response) => {
  const hiddenOrders = request.user.hiddenOrders || [];
  await expirePendingOrders({ customer: request.user._id });
  const orders = await Order.find({ customer: request.user._id, _id: { $nin: hiddenOrders } })
    .populate("pickupGym")
    .sort({ createdAt: -1 })
    .limit(60);
  response.json({ orders: orders.map((order) => publicOrder(order, { viewer: request.user })) });
});

ordersRouter.get("/me/returns", requireAuth, async (request, response) => {
  const returnRequests = await ReturnRequest.find({ customer: request.user._id })
    .populate("order")
    .sort({ createdAt: -1 })
    .limit(50);
  response.json({
    returnRequests: returnRequests.map((item) => {
      const json = item.toJSON();
      return { ...json, order: publicOrder(json.order, { viewer: request.user }) };
    }),
  });
});

ordersRouter.get("/gym-stock", requireAuth, requireRole("gym"), async (request, response) => {
  if (!request.user.gym) return response.json({ stock: [] });
  const stock = await GymStock.find({ gym: request.user.gym, quantity: { $gt: 0 } }).populate("product", "name slug imageUrl variants").sort({ productName: 1, variantLabel: 1 });
  response.json({ stock });
});

ordersRouter.get("/gym-restock-requests", requireAuth, requireRole("gym"), async (request, response) => {
  if (!request.user.gym) return response.json({ requests: [] });
  const requests = await GymRestockRequest.find({ gym: request.user.gym }).sort({ createdAt: -1 }).limit(50);
  response.json({ requests });
});

ordersRouter.post("/gym-restock-requests", requireAuth, requireRole("gym"), async (request, response) => {
  if (!request.user.gym) return response.status(400).json({ message: "Tu usuario no tiene gimnasio asignado" });
  const items = Array.isArray(request.body.items) ? request.body.items : [];
  const note = cleanString(request.body.note, 500);
  const requestItems = [];
  const requestedByVariant = new Map();

  for (const item of items.slice(0, 20)) {
    if (!validObjectId(item.productId)) continue;
    const quantity = positiveInt(item.quantity, { min: 1, max: 10 });
    if (!quantity) continue;
    const sku = cleanString(item.sku, 80);
    const product = await Product.findOne({ _id: item.productId, status: "active" }).select("name variants");
    const variant = product?.variants.find((entry) => entry.sku === sku);
    if (!product || !variant) continue;
    const current = await GymStock.findOne({ gym: request.user.gym, product: product._id, sku }).select("quantity");
    const currentStock = Number(current?.quantity || 0);
    const key = `${product._id}:${sku}`;
    const requestedTotal = (requestedByVariant.get(key) || 0) + quantity;
    requestedByVariant.set(key, requestedTotal);

    if (currentStock + requestedTotal > 10) {
      return response.status(400).json({ message: `${product.name} ${variant.label} supera el máximo de 10 piezas en gimnasio` });
    }
    if (variant.stock < requestedTotal) {
      return response.status(409).json({ message: `Stock central insuficiente para ${product.name} ${variant.label}` });
    }

    const existingPending = await GymRestockRequest.exists({
      gym: request.user.gym,
      status: "requested",
      "items.product": product._id,
      "items.sku": sku,
    });
    if (existingPending) {
      return response.status(409).json({ message: `${product.name} ${variant.label} ya tiene una solicitud pendiente` });
    }

    const existingLine = requestItems.find((entry) => entry.product.toString() === product._id.toString() && entry.sku === sku);
    if (existingLine) {
      existingLine.quantity += quantity;
      continue;
    }

    requestItems.push({
      product: product._id,
      productName: product.name,
      sku: variant.sku,
      variantLabel: variant.label,
      quantity,
      currentStock,
    });
  }

  if (!requestItems.length) return response.status(400).json({ message: "Selecciona productos válidos para reabastecer" });
  const restockRequest = await GymRestockRequest.create({
    requestNumber: createGymRestockNumber(),
    gym: request.user.gym,
    items: requestItems,
    note,
    requestedBy: request.user._id,
  });

  await notifyAdmins({
    title: "Solicitud de reabastecimiento de gimnasio",
    message: `${request.user.name} envió ${restockRequest.requestNumber} con ${requestItems.reduce((sum, item) => sum + item.quantity, 0)} pieza(s).`,
    type: "gym_restock",
    linkType: "gym_restock",
    linkId: restockRequest._id,
  });

  response.status(201).json({ request: restockRequest });
});

ordersRouter.post("/coupon-preview", requireAuth, async (request, response) => {
  const { code, subtotal = 0, deliveryMethod = "pickup" } = request.body;
  const parsedSubtotal = Number(subtotal || 0);
  if (!Number.isFinite(parsedSubtotal) || parsedSubtotal < 0) return response.status(400).json({ message: "Subtotal inválido" });
  if (!["pickup", "home"].includes(deliveryMethod)) return response.status(400).json({ message: "Método de entrega inválido" });
  const shippingFee = deliveryMethod === "home" ? 79 : 0;
  const coupon = await getValidCoupon(code, parsedSubtotal);
  if (coupon?.message) return response.status(400).json({ message: coupon.message });
  if (!coupon) return response.status(400).json({ message: "Ingresa un cupón" });

  const totals = calculateCouponDiscount(coupon, parsedSubtotal, shippingFee);
  response.json({
    coupon: {
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      discount: totals.discount,
      shippingFee: totals.shippingFee,
    },
  });
});

ordersRouter.post("/", requireAuth, async (request, response) => {
  const { items = [], deliveryMethod, pickupGym, shippingAddress, paymentMethod = "mercado_pago", couponCode } = request.body;
  if (!Array.isArray(items) || !items.length) return response.status(400).json({ message: "El carrito está vacío" });
  if (items.length > 25) return response.status(400).json({ message: "El carrito supera el límite de productos" });
  if (!["pickup", "home"].includes(deliveryMethod)) {
    return response.status(400).json({ message: "Método de entrega inválido" });
  }
  if (!["pickup", "mercado_pago"].includes(paymentMethod)) {
    return response.status(400).json({ message: "Método de pago inválido" });
  }
  if (deliveryMethod === "home" && paymentMethod === "pickup") {
    return response.status(400).json({ message: "El pago al recoger solo aplica para retiro en gimnasio" });
  }

  if (paymentMethod === "mercado_pago" && !isMercadoPagoConfigured()) {
    return response.status(503).json({ message: "Mercado Pago no está configurado" });
  }

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

  const normalizedItems = [];
  const itemMap = new Map();
  for (const item of items) {
    if (!validObjectId(item.productId)) return response.status(400).json({ message: "Producto inválido en carrito" });
    const quantity = positiveInt(item.quantity, { min: 1, max: 20 });
    if (!quantity) return response.status(400).json({ message: "Cantidad inválida en carrito" });
    const sku = cleanString(item.sku, 80);
    if (!sku) return response.status(400).json({ message: "SKU inválido en carrito" });
    const key = `${item.productId}:${sku}`;
    const current = itemMap.get(key) || { productId: item.productId, sku, quantity: 0 };
    current.quantity += quantity;
    if (current.quantity > 20) return response.status(400).json({ message: "Cantidad máxima por variante excedida" });
    itemMap.set(key, current);
  }
  normalizedItems.push(...itemMap.values());

  const paymentStatus = "pending";
  const order = await withTransaction(async (session) => {
    const orderItems = [];
    let subtotal = 0;
    let pointsEarned = 0;

    for (const item of normalizedItems) {
      const product = await Product.findById(item.productId).session(session);
      if (!product || product.status !== "active") throw Object.assign(new Error("Producto no disponible"), { status: 404 });

      const variant = product.variants.find((entry) => entry.sku === item.sku);
      if (!variant) throw Object.assign(new Error("Variante no disponible"), { status: 404 });

      const stockResult =
        deliveryMethod === "pickup" && gym
          ? await GymStock.updateOne(
              { gym: gym._id, product: product._id, sku: item.sku, quantity: { $gte: item.quantity } },
              { $inc: { quantity: -item.quantity } },
              { session }
            )
          : await Product.updateOne(
              { _id: product._id, status: "active", variants: { $elemMatch: { sku: item.sku, stock: { $gte: item.quantity } } } },
              { $inc: { "variants.$.stock": -item.quantity } },
              { session }
            );
      if (!stockResult.modifiedCount) throw conflict(`Stock insuficiente para ${product.name}`);

      subtotal += variant.price * item.quantity;
      pointsEarned += (product.pointsEarned || 0) * item.quantity;
      orderItems.push({
        product: product._id,
        productName: product.name,
        sku: variant.sku,
        variantLabel: variant.label,
        price: variant.price,
        cost: variant.cost || 0,
        quantity: item.quantity,
      });
    }

    let shippingFee = deliveryMethod === "home" ? 79 : 0;
    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await getValidCoupon(couponCode, subtotal);
      if (coupon?.message) throw Object.assign(new Error(coupon.message), { status: 400 });
      appliedCoupon = coupon;
      const totals = calculateCouponDiscount(coupon, subtotal, shippingFee);
      shippingFee = totals.shippingFee;
      discount = totals.discount;

      const couponFilter = { _id: appliedCoupon._id, active: true };
      if (appliedCoupon.usageLimit) couponFilter.usedCount = { $lt: appliedCoupon.usageLimit };
      const couponResult = await Coupon.updateOne(couponFilter, { $inc: { usedCount: 1 } }, { session });
      if (!couponResult.modifiedCount) throw conflict("Este cupón ya alcanzó su límite");
    }

    const created = await Order.create(
      [
        {
          orderNumber: createOrderNumber(),
          customer: request.user._id,
          items: orderItems,
          subtotal,
          shippingFee,
          total: Math.max(0, subtotal + shippingFee - discount),
          pointsEarned,
          deliveryMethod,
          pickupGym: gym?._id,
          pickupCode: deliveryMethod === "pickup" ? createPickupCode() : undefined,
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
          discount,
          discountCode: appliedCoupon?.code,
          status: "preparing",
          paymentStatus,
          paymentMethod,
          paymentProvider: paymentMethod === "mercado_pago" ? "mercado_pago" : "pickup",
          paymentExpiresAt: paymentMethod === "mercado_pago" ? paymentDeadlineFrom() : undefined,
        },
      ],
      { session }
    );
    return created[0];
  });

  if (paymentMethod === "mercado_pago") {
    order.status = "pending_payment";
    try {
      const preference = await createPaymentPreference({
        order,
        user: request.user,
        clientOrigin: request.headers.origin || env.clientOrigin,
      });
      order.providerPreferenceId = preference.id;
      order.paymentUrl = paymentPreferenceUrl(preference);
      await order.save();
    } catch (error) {
      order.status = "cancelled";
      await cancelOrderWithRestock(order);
      throw error;
    }
  }

  await createNotification({
    recipient: request.user._id,
    title: paymentMethod === "mercado_pago" ? "Pedido pendiente de pago" : "Pedido confirmado",
    message: paymentMethod === "mercado_pago" ? `${order.orderNumber} espera pago en Mercado Pago.` : `${order.orderNumber} ya está en preparación.`,
    type: "order",
    linkType: "order",
    linkId: order._id,
  });
  await notifyAdmins({
    title: "Nuevo pedido",
    message: `${order.orderNumber} por ${formatMoney(order.total)}.`,
    type: "order",
    linkType: "order",
    linkId: order._id,
  });

  response.status(201).json({ order: publicOrder(order, { viewer: request.user }), paymentUrl: order.paymentUrl });
});

ordersRouter.patch("/:id/cancel", requireAuth, async (request, response) => {
  const filter = { _id: request.params.id };
  if (request.user.role === "customer") filter.customer = request.user._id;

  let order = await Order.findOne(filter);
  if (!order) return response.status(404).json({ message: "Pedido no encontrado" });
  if (!["pending_payment", "paid", "preparing"].includes(order.status)) {
    return response.status(409).json({ message: "Este pedido ya no se puede cancelar" });
  }

  order = await cancelOrderWithRestock(order);
  response.json({ order: publicOrder(order, { viewer: request.user }) });
});

ordersRouter.post("/:id/pay", requireAuth, async (request, response) => {
  if (!isMercadoPagoConfigured()) return response.status(503).json({ message: "Mercado Pago no está configurado" });

  let order = await Order.findOne({ _id: request.params.id, customer: request.user._id });
  if (!order) return response.status(404).json({ message: "Pedido no encontrado" });
  order = await expirePendingOrderIfNeeded(order);
  if (order.status === "cancelled") return response.status(409).json({ message: "El tiempo para pagar este pedido ya venció" });
  if (order.paymentStatus === "paid") return response.status(409).json({ message: "Este pedido ya está pagado" });
  if (order.paymentMethod !== "mercado_pago" || order.status !== "pending_payment") {
    return response.status(409).json({ message: "Este pedido no está disponible para pago en línea" });
  }

  const preference = await createPaymentPreference({
    order,
    user: request.user,
    clientOrigin: request.headers.origin || env.clientOrigin,
  });
  order.providerPreferenceId = preference.id;
  order.paymentUrl = paymentPreferenceUrl(preference);
  order.paymentExpiresAt = order.paymentExpiresAt || effectivePaymentDeadline(order);
  await order.save();
  response.json({ order: publicOrder(order, { viewer: request.user }), paymentUrl: order.paymentUrl });
});

ordersRouter.delete("/me/history", requireAuth, async (request, response) => {
  const { orderIds = [] } = request.body || {};
  if (!Array.isArray(orderIds) || !orderIds.length) {
    return response.status(400).json({ message: "Selecciona al menos un pedido" });
  }
  const orders = await Order.find({ customer: request.user._id, _id: { $in: orderIds } }).select("_id");
  const ids = orders.map((order) => order._id);
  request.user.hiddenOrders = [...new Set([...(request.user.hiddenOrders || []).map(String), ...ids.map(String)])];
  await request.user.save();
  response.json({ hiddenCount: ids.length });
});

ordersRouter.post("/:id/return", requireAuth, async (request, response) => {
  const reason = cleanString(request.body.reason, 500);
  if (reason.length < 10) return response.status(400).json({ message: "Describe el motivo de devolución" });

  const order = await Order.findOne({ _id: request.params.id, customer: request.user._id });
  if (!order) return response.status(404).json({ message: "Pedido no encontrado" });
  if (order.status !== "delivered") return response.status(409).json({ message: "Solo puedes solicitar devolución de pedidos entregados" });

  const existing = await ReturnRequest.findOne({ order: order._id });
  if (existing) return response.status(409).json({ message: "Este pedido ya tiene una solicitud de devolución" });

  const returnRequest = await ReturnRequest.create({
    returnNumber: createReturnNumber(),
    order: order._id,
    customer: request.user._id,
    reason,
  });

  await createNotification({
    recipient: request.user._id,
    title: "Devolución solicitada",
    message: `${returnRequest.returnNumber} quedó en revisión.`,
    type: "return",
    linkType: "return",
    linkId: returnRequest._id,
  });
  await notifyAdmins({
    title: "Nueva devolución",
    message: `${returnRequest.returnNumber} requiere revisión.`,
    type: "return",
    linkType: "return",
    linkId: returnRequest._id,
  });

  response.status(201).json({ returnRequest });
});

ordersRouter.get("/", requireAuth, requireRole("admin", "staff", "gym"), requireOrdersPanelAccess, async (request, response) => {
  const showArchived = ["1", "true", "yes"].includes(String(request.query.archived || "").toLowerCase());
  const filter = showArchived ? { adminArchivedAt: { $exists: true } } : { adminArchivedAt: { $exists: false } };
  if (request.user.role === "gym") {
    if (!request.user.gym) return response.json({ orders: [] });
    filter.pickupGym = request.user.gym;
    filter.deliveryMethod = "pickup";
  }

  if (!showArchived) await expirePendingOrders(request.user.role === "gym" ? filter : {});
  const orders = await Order.find(filter).populate("customer pickupGym").sort({ createdAt: -1 }).limit(100);
  response.json({ orders: orders.map((order) => publicOrder(order, { viewer: request.user })) });
});

ordersRouter.patch("/:id/archive", requireAuth, requireRole("admin", "staff"), requireOrdersPanelAccess, async (request, response) => {
  const order = await Order.findById(request.params.id);
  if (!order) return response.status(404).json({ message: "Pedido no encontrado" });
  if (order.status !== "cancelled") return response.status(409).json({ message: "Solo puedes archivar pedidos cancelados" });
  order.adminArchivedAt = new Date();
  await order.save();
  await writeAuditLog(request, { action: "order.archive", resource: "order", resourceId: order._id, metadata: { orderNumber: order.orderNumber } });
  response.json({ order: publicOrder(order, { viewer: request.user }) });
});

ordersRouter.patch("/:id/unarchive", requireAuth, requireRole("admin", "staff"), requireOrdersPanelAccess, async (request, response) => {
  const order = await Order.findById(request.params.id);
  if (!order) return response.status(404).json({ message: "Pedido no encontrado" });
  order.adminArchivedAt = undefined;
  await order.save();
  await writeAuditLog(request, { action: "order.unarchive", resource: "order", resourceId: order._id, metadata: { orderNumber: order.orderNumber } });
  response.json({ order: publicOrder(order, { viewer: request.user }) });
});

ordersRouter.patch("/:id/status", requireAuth, requireRole("admin", "staff", "gym"), requireOrdersPanelAccess, async (request, response) => {
  const allowedStatuses = ["pending_payment", "paid", "preparing", "ready_for_pickup", "in_transit", "delivered", "cancelled", "returned"];
  if (!allowedStatuses.includes(request.body.status)) return response.status(400).json({ message: "Estado inválido" });
  const filter = { _id: request.params.id };
  if (request.user.role === "gym") {
    if (!["preparing", "ready_for_pickup", "cancelled"].includes(request.body.status)) {
      return response.status(400).json({ message: "Usa el código de retiro para confirmar la entrega" });
    }
    filter.pickupGym = request.user.gym;
    filter.deliveryMethod = "pickup";
  }

  let order = await Order.findOne(filter);
  if (!order) return response.status(404).json({ message: "Pedido no encontrado" });
  if (request.body.status === "cancelled") order = await cancelOrderWithRestock(order);
  else {
    order.status = request.body.status;
    if (request.body.status === "pending_payment") {
      order.paymentStatus = "pending";
      order.paymentMethod = "mercado_pago";
      order.paymentProvider = "mercado_pago";
      order.paymentExpiresAt = paymentDeadlineFrom();
      order.paymentUrl = "";
      order.providerPreferenceId = "";
    }
    await order.save();
  }
  await writeAuditLog(request, { action: "order.status_update", resource: "order", resourceId: order._id, metadata: { status: order.status } });
  await createNotification({
    recipient: order.customer,
    title: "Pedido actualizado",
    message: `${order.orderNumber} cambió a ${order.status}.`,
    type: "order",
    linkType: "order",
    linkId: order._id,
  });
  response.json({ order: publicOrder(order, { viewer: request.user }) });
});

ordersRouter.patch("/:id/payment", requireAuth, requireRole("admin", "staff", "gym"), requireOrdersPanelAccess, async (request, response) => {
  const allowed = ["pending", "paid", "refunded"];
  if (!allowed.includes(request.body.paymentStatus)) {
    return response.status(400).json({ message: "Estado de pago inválido" });
  }
  const filter = { _id: request.params.id };
  if (request.user.role === "gym") {
    filter.pickupGym = request.user.gym;
    filter.deliveryMethod = "pickup";
  }

  const order = await Order.findOne(filter);
  if (!order) return response.status(404).json({ message: "Pedido no encontrado" });
  const wasPaid = order.paymentStatus === "paid";
  order.paymentStatus = request.body.paymentStatus;
  if (request.body.paymentStatus === "paid") {
    order.paidAt = new Date();
    if (order.status === "pending_payment") order.status = "preparing";
    if (!wasPaid) await grantOrderPointsOnce(order);
  } else {
    order.paidAt = undefined;
  }
  await order.save();
  await writeAuditLog(request, { action: "order.payment_update", resource: "order", resourceId: order._id, metadata: { paymentStatus: order.paymentStatus } });
  await createNotification({
    recipient: order.customer,
    title: "Pago actualizado",
    message: `${order.orderNumber} ahora tiene pago ${order.paymentStatus}.`,
    type: "payment",
    linkType: "order",
    linkId: order._id,
  });
  response.json({ order: publicOrder(order, { viewer: request.user }) });
});

ordersRouter.post("/:id/payment-refresh", requireAuth, async (request, response) => {
  const paymentId = cleanString(request.body.paymentId, 80);
  if (!paymentId) return response.status(400).json({ message: "Falta identificador de pago" });

  const payment = await getPayment(paymentId);
  const order = await updateOrderFromMercadoPagoPayment(payment);
  if (!order || order._id.toString() !== request.params.id || order.customer.toString() !== request.user._id.toString()) {
    return response.status(404).json({ message: "Pedido no encontrado" });
  }

  response.json({ order: publicOrder(order, { viewer: request.user }) });
});

ordersRouter.post("/mercado-pago/webhook", async (request, response) => {
  const paymentId = request.body?.data?.id || request.query?.["data.id"] || request.query?.id;
  const type = request.body?.type || request.query?.type || request.query?.topic;
  if (paymentId && String(type || "").includes("payment")) {
    try {
      const payment = await getPayment(paymentId);
      await updateOrderFromMercadoPagoPayment(payment);
    } catch (error) {
      console.error("Mercado Pago webhook error", error);
      return response.status(502).json({ message: "No se pudo sincronizar el pago" });
    }
  }
  response.sendStatus(200);
});

ordersRouter.post("/:id/pickup-confirm", requireAuth, requireRole("admin", "staff", "gym"), requireOrdersPanelAccess, async (request, response) => {
  const code = String(request.body.pickupCode || "").trim();
  const filter = { _id: request.params.id, deliveryMethod: "pickup" };
  if (request.user.role === "gym") filter.pickupGym = request.user.gym;

  const order = await Order.findOne(filter).populate("customer pickupGym");
  if (!order) return response.status(404).json({ message: "Pedido no encontrado" });
  if (order.status === "delivered") return response.json({ order: publicOrder(order, { viewer: request.user }) });
  if (order.pickupCode && order.pickupCode !== code) {
    return response.status(400).json({ message: "Código de retiro incorrecto" });
  }
  const wasPaid = order.paymentStatus === "paid";
  if (order.paymentMethod === "pickup" && order.paymentStatus !== "paid") {
    order.paymentStatus = "paid";
    order.paidAt = new Date();
  }
  order.status = "delivered";
  order.deliveredAt = new Date();
  if (!wasPaid && order.paymentStatus === "paid") await grantOrderPointsOnce(order);
  await order.save();
  await writeAuditLog(request, { action: "order.pickup_confirm", resource: "order", resourceId: order._id, metadata: { pickupGym: order.pickupGym?._id || order.pickupGym } });
  await createNotification({
    recipient: order.customer,
    title: "Pedido entregado",
    message: `${order.orderNumber} fue entregado en ${order.pickupGym?.name || "el gimnasio"}.`,
    type: "order",
    linkType: "order",
    linkId: order._id,
  });
  response.json({ order: publicOrder(order, { viewer: request.user }) });
});

ordersRouter.get("/:id/shipping-guide.pdf", requireAuth, requireRole("admin", "staff", "gym"), requireOrdersPanelAccess, async (request, response) => {
  const order = await Order.findById(request.params.id).populate("customer pickupGym");
  if (!order) return response.status(404).json({ message: "Pedido no encontrado" });

  const address = order.shippingAddress || {};
  const lines = [
    "GymVerse - Guía de envío",
    `Pedido: ${order.orderNumber}`,
    `Cliente: ${order.customer?.name || "Sin cliente"}`,
    `Correo: ${order.customer?.email || ""}`,
    `Método: ${order.deliveryMethod === "home" ? "Domicilio" : "Retiro en gimnasio"}`,
    order.deliveryMethod === "home"
      ? `Destino: ${address.street || ""}, ${address.city || ""}, ${address.state || ""}, CP ${address.zip || ""}`
      : `Punto de retiro: ${order.pickupGym?.name || ""}`,
    order.pickupCode ? `Código de retiro: ${order.pickupCode}` : "",
    `Teléfono: ${address.phone || ""}`,
    "",
    "Productos:",
    ...order.items.map((item) => `${item.quantity} x ${item.productName} - ${item.variantLabel} (${item.sku})`),
    "",
    `Subtotal: ${formatMoney(order.subtotal)}`,
    `Envío: ${formatMoney(order.shippingFee)}`,
    order.discount ? `Descuento${order.discountCode ? ` (${order.discountCode})` : ""}: -${formatMoney(order.discount)}` : "",
    `Total: ${formatMoney(order.total)}`,
    "",
    "Notas: documento generado por GymVerse Admin.",
  ];

  const pdf = createSimplePdf(lines);
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename="${order.orderNumber}-guia.pdf"`);
  response.send(pdf);
});
