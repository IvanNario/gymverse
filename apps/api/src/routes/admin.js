import { Router } from "express";
import bcrypt from "bcryptjs";
import { requireAdminAccess, requireAuth, requireRole } from "../middleware/auth.js";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Supplier } from "../models/Supplier.js";
import { Gym } from "../models/Gym.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { StockMovement } from "../models/StockMovement.js";
import { RewardDrop } from "../models/RewardDrop.js";
import { RewardOrder } from "../models/RewardOrder.js";
import { RestockGuide } from "../models/RestockGuide.js";
import { GymStock } from "../models/GymStock.js";
import { GymRestockRequest } from "../models/GymRestockRequest.js";
import { ReturnRequest } from "../models/ReturnRequest.js";
import { Coupon } from "../models/Coupon.js";
import { Notification } from "../models/Notification.js";
import { AutomationRun } from "../models/AutomationRun.js";
import { ContentPost } from "../models/ContentPost.js";
import { AuditLog } from "../models/AuditLog.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { LegalDocument } from "../models/LegalDocument.js";
import { createDocumentPdf, createSimplePdf } from "../utils/pdf.js";
import { createNotification } from "../utils/notifications.js";
import { cleanString, isEmail, isStrongEnoughPassword, normalizeEmail } from "../utils/validation.js";
import { ADMIN_ROLE_PRESETS, hasAdminPermission, permissionsForPreset } from "../utils/adminPermissions.js";
import { privateAddress, publicAddress, publicCustomer, publicGym, publicOrder, publicSupplier, maskEmail } from "../utils/privacy.js";
import { writeAuditLog } from "../utils/auditLog.js";
import { ensureDefaultLegalDocuments } from "../utils/legalDocuments.js";
import { conflict, withTransaction } from "../utils/concurrency.js";
import { uploadImageAsset } from "../utils/imageStorage.js";

export const adminRouter = Router();
const automationRules = [
  {
    id: "expired_coupons",
    title: "Pausar promociones vencidas",
    description: "Desactiva cupones activos cuya fecha final ya pasó.",
  },
  {
    id: "low_stock_alerts",
    title: "Alertas de stock bajo",
    description: "Detecta variantes con menos de 10 piezas y avisa al equipo admin.",
  },
  {
    id: "payment_reminders",
    title: "Recordatorios de pago",
    description: "Recuerda a clientes con pedidos de Mercado Pago pendientes por más de 30 minutos.",
  },
  {
    id: "gym_payment_overdue",
    title: "Afiliaciones vencidas",
    description: "Marca gimnasios afiliados con fecha de pago vencida como atrasados.",
  },
];

async function versionedFindByIdAndUpdate(Model, id, payload, options = {}) {
  const { populate, ...queryOptions } = options;
  const version = Number(payload?.__v);
  const updatePayload = { ...payload };
  delete updatePayload._id;
  delete updatePayload.id;
  delete updatePayload.__v;
  delete updatePayload.createdAt;
  delete updatePayload.updatedAt;

  if (!Number.isFinite(version)) {
    const document = await Model.findByIdAndUpdate(id, updatePayload, { new: true, ...queryOptions });
    if (document && populate) await document.populate(populate);
    return document;
  }

  const document = await Model.findOneAndUpdate(
    { _id: id, __v: version },
    { $set: updatePayload, $inc: { __v: 1 } },
    { new: true, ...queryOptions }
  );
  if (!document) throw conflict("Este registro fue actualizado por otra persona. Recarga la información antes de guardar.");
  if (populate) await document.populate(populate);
  return document;
}

adminRouter.use(requireAuth, requireAdminAccess);

function permissionForAdminPath(path) {
  if (path.startsWith("/users")) return "users";
  if (path === "/stats" || path === "/analytics") return "overview";
  if (path.startsWith("/finance")) return ["finance", "reports", "overview"];
  if (path.startsWith("/audit-logs")) return "audit";
  if (path.startsWith("/support")) return "support";
  if (path.startsWith("/legal-documents")) return "legal";
  if (path === "/notifications" || path.startsWith("/notifications/")) return "notifications";
  if (path.startsWith("/automations")) return "automations";
  if (path.startsWith("/content")) return "content";
  if (path === "/inventory") return ["inventory", "restock", "rewards", "content"];
  if (path.startsWith("/products") || path.startsWith("/uploads/images") || path.startsWith("/categories")) return "inventory";
  if (path.startsWith("/restocks") || path.startsWith("/restock-guides") || path.startsWith("/gym-restock-requests") || path.startsWith("/gym-stock")) return ["restock", "overview", "gyms"];
  if (path.startsWith("/reward-drops") || path.startsWith("/reward-orders")) return "rewards";
  if (path.startsWith("/coupons")) return "coupons";
  if (path.startsWith("/returns")) return "returns";
  if (path.startsWith("/reports")) return "reports";
  if (path.startsWith("/suppliers")) return ["suppliers", "inventory", "restock"];
  if (path.startsWith("/gyms")) return "gyms";
  return null;
}

adminRouter.use((request, response, next) => {
  if (request.user.role === "admin") return next();
  const permission = permissionForAdminPath(request.path);
  const allowed = Array.isArray(permission)
    ? permission.some((entry) => hasAdminPermission(request.user, entry))
    : permission && hasAdminPermission(request.user, permission);
  if (!allowed) return response.status(403).json({ message: "No tienes acceso a este módulo" });
  next();
});

function cleanDropPayload(body, userId) {
  return {
    title: String(body.title || "").trim(),
    subtitle: String(body.subtitle || "").trim(),
    bannerText: String(body.bannerText || "").trim(),
    imageUrl: String(body.imageUrl || "").trim(),
    status: body.status || "draft",
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    items: (body.items || [])
      .filter((item) => item.product && item.sku)
      .map((item) => ({
        product: item.product,
        sku: String(item.sku || "").trim(),
        pointsCost: Number(item.pointsCost || 0),
        stock: Number(item.stock || 0),
        active: item.active !== false,
      })),
    createdBy: userId,
  };
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sendPdf(response, filename, pdf) {
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  response.send(pdf);
}

function csvValue(value) {
  if (value instanceof Date) return value.toISOString();
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function createCsv(rows = []) {
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  if (!headers.length) return "";
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(","))].join("\n");
}

function sendCsv(response, filename, rows) {
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  response.send(`\uFEFF${createCsv(rows)}`);
}

async function buildRestockGuide(items) {
  if (!Array.isArray(items) || !items.length) {
    return { status: 400, message: "Selecciona productos para reabastecer" };
  }

  const guideItems = [];
  for (const item of items) {
    const quantity = Number(item.quantity || 0);
    if (!item.productId || !item.sku || quantity <= 0) continue;
    const product = await Product.findById(item.productId).populate("supplier");
    if (!product) continue;
    const variant = product.variants.find((entry) => entry.sku === item.sku);
    if (!variant) continue;
    const unitCost = Number(item.unitCost || variant.cost || 0);
    guideItems.push({
      product: product._id,
      supplier: product.supplier?._id,
      supplierId: product.supplier?._id?.toString() || "sin-proveedor",
      supplierName: product.supplier?.name || "Sin proveedor",
      email: product.supplier?.email || "",
      productName: product.name,
      sku: variant.sku,
      variantLabel: variant.label,
      quantity,
      unitCost,
      totalCost: unitCost * quantity,
    });
  }

  if (!guideItems.length) {
    return { status: 400, message: "No hay productos válidos para la guía" };
  }

  const groups = Object.values(
    guideItems.reduce((acc, item) => {
      if (!acc[item.supplierId]) {
        acc[item.supplierId] = {
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          email: item.email,
          items: [],
        };
      }
      acc[item.supplierId].items.push(item);
      return acc;
    }, {})
  );

  return {
    guideNumber: `GVRG-${Date.now()}`,
    groups,
    items: guideItems,
    totalCost: guideItems.reduce((sum, item) => sum + item.totalCost, 0),
    totalItems: guideItems.reduce((sum, item) => sum + item.quantity, 0),
  };
}

function groupRestockItems(items = []) {
  return Object.values(
    items.reduce((acc, item) => {
      const supplierId = item.supplier?.toString?.() || item.supplierId || item.supplierName || "sin-proveedor";
      if (!acc[supplierId]) {
        acc[supplierId] = {
          supplierId,
          supplierName: item.supplierName || "Sin proveedor",
          email: item.email || "",
          items: [],
        };
      }
      acc[supplierId].items.push(item);
      return acc;
    }, {})
  );
}

function createRestockGuidePdf(guide) {
  const groups = guide.groups || groupRestockItems(guide.items);
  const supplierSections = groups.map((group) => {
    const supplierTotal = group.items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
    return {
      heading: `Proveedor: ${group.supplierName}${group.email ? ` | ${group.email}` : ""}`,
      rows: [
        ...group.items.map(
          (item) =>
            `${item.quantity} pz | ${item.productName} | ${item.variantLabel} | ${item.sku} | Costo unitario ${formatMoney(item.unitCost)} | Total ${formatMoney(item.totalCost)}`
        ),
        `Total proveedor: ${formatMoney(supplierTotal)}`,
      ],
    };
  });

  return createDocumentPdf({
    title: "Guía de reabastecimiento",
    subtitle: guide.guideNumber,
    sections: [
      {
        heading: "Resumen",
        rows: [
          `Guía: ${guide.guideNumber}`,
          `Productos seleccionados: ${guide.totalItems} pz`,
          `Costo estimado: ${formatMoney(guide.totalCost)}`,
          `Generado: ${formatDate(guide.createdAt || new Date())}`,
        ],
      },
      ...supplierSections,
    ],
  });
}

async function getReportRows(kind, viewer) {
  const includePrivate = viewer?.role === "admin";
  if (kind === "sales") {
    const orders = await Order.find().populate("customer pickupGym").sort({ createdAt: -1 });
    return {
      title: "Reporte de ventas",
      rows: orders.map((order) => ({
        orderNumber: order.orderNumber,
        customer: order.customer?.name || "",
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        pointsEarned: order.pointsEarned || 0,
        createdAt: order.createdAt,
      })),
    };
  }
  if (kind === "registrations") {
    const users = await User.find().sort({ createdAt: -1 });
    return {
      title: "Reporte de registros",
      rows: users.map((user) => ({
        name: user.name,
        email: includePrivate ? user.email : maskEmail(user.email),
        role: user.role,
        points: user.points || 0,
        createdAt: user.createdAt,
      })),
    };
  }
  if (kind === "payments") {
    const [orders, gyms] = await Promise.all([Order.find().populate("customer"), Gym.find({ status: { $ne: "archived" } })]);
    return {
      title: "Reporte de pagos",
      rows: [
        ...orders.map((order) => ({
          type: "order",
          reference: order.orderNumber,
          entity: order.customer?.name || "",
          status: order.paymentStatus,
          amount: order.total,
          createdAt: order.paidAt || order.createdAt,
        })),
        ...gyms.map((gym) => ({
          type: "gym",
          reference: gym.code,
          entity: gym.name,
          status: gym.paymentStatus,
          amount: gym.membershipFee || 0,
          createdAt: gym.lastPaymentAt || gym.updatedAt,
        })),
      ],
    };
  }
  if (kind === "movements") {
    const movements = await StockMovement.find().populate("supplier createdBy").sort({ createdAt: -1 });
    return {
      title: "Reporte de movimientos",
      rows: movements.map((movement) => ({
        product: movement.productName,
        sku: movement.sku,
        variant: movement.variantLabel,
        supplier: movement.supplier?.name || "",
        quantity: movement.quantity,
        unitCost: movement.unitCost,
        totalCost: movement.totalCost,
        note: movement.note,
        createdAt: movement.createdAt,
      })),
    };
  }
  return null;
}

async function buildAnalytics(viewer) {
  const includePrivate = viewer?.role === "admin";
  const orders = await Order.find().populate("customer pickupGym").sort({ createdAt: -1 });
  const products = await Product.find({ status: { $ne: "archived" } }).populate("category supplier");
  const validOrders = orders.filter((order) => !["cancelled", "returned"].includes(order.status));
  const totalRevenue = validOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalDiscount = validOrders.reduce((sum, order) => sum + Number(order.discount || 0), 0);
  const totalCost = validOrders.reduce(
    (sum, order) => sum + order.items.reduce((inner, item) => inner + Number(item.cost || 0) * Number(item.quantity || 0), 0),
    0
  );

  const productMap = new Map();
  const customerMap = new Map();
  const deliveryMap = new Map();
  const couponMap = new Map();
  const monthMap = new Map();

  for (const order of validOrders) {
    const customerId = order.customer?._id?.toString() || "sin-cliente";
    const customerEntry = customerMap.get(customerId) || {
      customerId,
      name: order.customer?.name || "Sin cliente",
      email: includePrivate ? order.customer?.email || "" : maskEmail(order.customer?.email || ""),
      orders: 0,
      revenue: 0,
      pointsEarned: 0,
    };
    customerEntry.orders += 1;
    customerEntry.revenue += Number(order.total || 0);
    customerEntry.pointsEarned += Number(order.pointsEarned || 0);
    customerMap.set(customerId, customerEntry);

    const deliveryKey = order.deliveryMethod || "unknown";
    const deliveryEntry = deliveryMap.get(deliveryKey) || { key: deliveryKey, orders: 0, revenue: 0 };
    deliveryEntry.orders += 1;
    deliveryEntry.revenue += Number(order.total || 0);
    deliveryMap.set(deliveryKey, deliveryEntry);

    if (order.discountCode) {
      const couponEntry = couponMap.get(order.discountCode) || { code: order.discountCode, uses: 0, discount: 0, revenue: 0 };
      couponEntry.uses += 1;
      couponEntry.discount += Number(order.discount || 0);
      couponEntry.revenue += Number(order.total || 0);
      couponMap.set(order.discountCode, couponEntry);
    }

    const monthKey = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const monthEntry = monthMap.get(monthKey) || { month: monthKey, orders: 0, revenue: 0, profit: 0 };
    monthEntry.orders += 1;
    monthEntry.revenue += Number(order.total || 0);

    for (const item of order.items) {
      const key = `${item.product?.toString?.() || item.productName}-${item.sku}`;
      const entry = productMap.get(key) || {
        productName: item.productName,
        sku: item.sku,
        variantLabel: item.variantLabel,
        quantity: 0,
        revenue: 0,
        profit: 0,
      };
      const quantity = Number(item.quantity || 0);
      const revenue = Number(item.price || 0) * quantity;
      const profit = (Number(item.price || 0) - Number(item.cost || 0)) * quantity;
      entry.quantity += quantity;
      entry.revenue += revenue;
      entry.profit += profit;
      productMap.set(key, entry);
      monthEntry.profit += profit;
    }
    monthMap.set(monthKey, monthEntry);
  }

  const lowStockProducts = products
    .flatMap((product) =>
      product.variants
        .filter((variant) => variant.stock < 10)
        .map((variant) => ({
          productName: product.name,
          sku: variant.sku,
          variantLabel: variant.label,
          stock: variant.stock,
          supplier: product.supplier?.name || "",
        }))
    )
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8);

  return {
    summary: {
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      totalDiscount,
      orders: validOrders.length,
      averageTicket: validOrders.length ? totalRevenue / validOrders.length : 0,
    },
    topProducts: Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    topCustomers: Array.from(customerMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    deliveryChannels: Array.from(deliveryMap.values()).sort((a, b) => b.revenue - a.revenue),
    couponPerformance: Array.from(couponMap.values()).sort((a, b) => b.uses - a.uses).slice(0, 8),
    monthlySales: Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-6),
    lowStockProducts,
  };
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function buildFinanceSummary() {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [orders, gyms, restocks] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).limit(400),
    Gym.find({ status: { $ne: "archived" } }).sort({ name: 1 }),
    StockMovement.find({ createdAt: { $gte: previousStart } }).sort({ createdAt: -1 }),
  ]);

  const validOrders = orders.filter((order) => !["cancelled", "returned"].includes(order.status));
  const paidOrders = validOrders.filter((order) => order.paymentStatus === "paid");
  const pendingOrders = validOrders.filter((order) => order.paymentStatus === "pending");
  const refundedOrders = orders.filter((order) => order.paymentStatus === "refunded");
  const orderRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingRevenue = pendingOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const refundedRevenue = refundedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const costOfGoods = paidOrders.reduce(
    (sum, order) => sum + order.items.reduce((inner, item) => inner + Number(item.cost || 0) * Number(item.quantity || 0), 0),
    0
  );
  const affiliateExpected = gyms.reduce((sum, gym) => sum + Number(gym.membershipFee || 0), 0);
  const affiliatePaid = gyms
    .filter((gym) => gym.paymentStatus === "paid")
    .reduce((sum, gym) => sum + Number(gym.membershipFee || 0), 0);
  const affiliatePending = gyms
    .filter((gym) => gym.paymentStatus !== "paid")
    .reduce((sum, gym) => sum + Number(gym.membershipFee || 0), 0);
  const restockSpend = restocks.filter((movement) => movement.createdAt >= currentStart).reduce((sum, movement) => sum + Number(movement.totalCost || 0), 0);

  const byMonth = new Map();
  for (const order of paidOrders) {
    const key = monthKey(order.createdAt);
    const entry = byMonth.get(key) || { month: key, revenue: 0, cost: 0, profit: 0, orders: 0 };
    const cost = order.items.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.quantity || 0), 0);
    entry.revenue += Number(order.total || 0);
    entry.cost += cost;
    entry.profit += Number(order.total || 0) - cost;
    entry.orders += 1;
    byMonth.set(key, entry);
  }

  const currentOrders = paidOrders.filter((order) => order.createdAt >= currentStart);
  const previousOrders = paidOrders.filter((order) => order.createdAt >= previousStart && order.createdAt < currentStart);
  const currentRevenue = currentOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  return {
    summary: {
      orderRevenue,
      affiliateExpected,
      affiliatePaid,
      affiliatePending,
      grossRevenue: orderRevenue + affiliatePaid,
      pendingRevenue,
      refundedRevenue,
      costOfGoods,
      restockSpend,
      estimatedProfit: orderRevenue - costOfGoods,
      currentRevenue,
      previousRevenue,
      revenueDelta: currentRevenue - previousRevenue,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
      paidGyms: gyms.filter((gym) => gym.paymentStatus === "paid").length,
      pendingGyms: gyms.filter((gym) => gym.paymentStatus !== "paid").length,
    },
    monthly: Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-8),
    pendingPayments: [
      ...pendingOrders.slice(0, 8).map((order) => ({
        type: "Pedido",
        reference: order.orderNumber,
        entity: "Cliente",
        amount: order.total,
        status: order.paymentStatus,
        dueAt: order.createdAt,
      })),
      ...gyms.filter((gym) => gym.paymentStatus !== "paid").slice(0, 8).map((gym) => ({
        type: "Gimnasio",
        reference: gym.code,
        entity: gym.name,
        amount: gym.membershipFee || 0,
        status: gym.paymentStatus,
        dueAt: gym.nextPaymentDue || gym.updatedAt,
      })),
    ],
  };
}

function publicAuditLog(log) {
  const json = log.toJSON ? log.toJSON() : log;
  return {
    ...json,
    actor: json.actor ? { name: json.actor.name, email: maskEmail(json.actor.email || ""), role: json.actor.role } : null,
    ip: json.ip ? `${String(json.ip).slice(0, 7)}...` : "",
    userAgent: json.userAgent ? `${String(json.userAgent).slice(0, 90)}${String(json.userAgent).length > 90 ? "..." : ""}` : "",
  };
}

function publicSupportTicket(ticket, includePrivate = false) {
  const json = ticket.toJSON ? ticket.toJSON() : ticket;
  return {
    ...json,
    customer: json.customer
      ? {
          _id: json.customer._id,
          name: json.customer.name,
          email: includePrivate ? json.customer.email : maskEmail(json.customer.email || ""),
        }
      : null,
  };
}

function cleanLegalPayload(body = {}, userId) {
  return {
    title: cleanString(body.title, 160),
    intro: cleanString(body.intro, 320),
    status: body.status === "draft" ? "draft" : "published",
    versionLabel: cleanString(body.versionLabel, 80),
    sortOrder: Number(body.sortOrder || 0),
    blocks: (body.blocks || [])
      .map((block) => ({
        heading: cleanString(block.heading, 140),
        text: cleanString(block.text, 1800),
      }))
      .filter((block) => block.heading && block.text),
    updatedBy: userId,
  };
}

function reportRowText(kind, row) {
  if (kind === "sales") {
    return `${formatDate(row.createdAt)} | ${row.orderNumber} | ${row.customer || "Sin cliente"} | ${row.status} | Pago ${row.paymentStatus} | ${formatMoney(row.total)} | ${row.pointsEarned} pts`;
  }
  if (kind === "registrations") {
    return `${formatDate(row.createdAt)} | ${row.name} | ${row.email} | ${row.role} | ${row.points} pts`;
  }
  if (kind === "payments") {
    const type = row.type === "gym" ? "Gimnasio" : "Pedido";
    return `${formatDate(row.createdAt)} | ${type} ${row.reference} | ${row.entity} | ${row.status} | ${formatMoney(row.amount)}`;
  }
  if (kind === "movements") {
    return `${formatDate(row.createdAt)} | ${row.product} | ${row.variant} (${row.sku}) | ${row.supplier || "Sin proveedor"} | ${row.quantity} pz | ${formatMoney(row.totalCost)} | ${row.note || ""}`;
  }
  return JSON.stringify(row);
}

function parseImagePayload({ dataUrl = "", filename = "" }) {
  const match = String(dataUrl).match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  return { buffer, dataUrl: match[0], mimeType: match[1], filename: cleanString(filename, 120) || "product-image" };
}

function publicGymAccess(user) {
  if (!user) return null;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    status: user.status || "active",
    updatedAt: user.updatedAt,
  };
}

async function attachGymAccess(gyms) {
  const list = Array.isArray(gyms) ? gyms : [gyms];
  const accessUsers = await User.find({ role: "gym", gym: { $in: list.map((gym) => gym._id) } }).select("name email status gym updatedAt");
  const byGym = accessUsers.reduce((acc, user) => {
    acc[user.gym?.toString()] = user;
    return acc;
  }, {});
  const mapped = list.map((gym) => {
    const json = gym.toJSON ? gym.toJSON() : gym;
    return { ...json, accessUser: publicGymAccess(byGym[gym._id.toString()]) };
  });
  return Array.isArray(gyms) ? mapped : mapped[0];
}

function cleanGymAccessPayload(body = {}) {
  return {
    name: cleanString(body.name, 120),
    email: normalizeEmail(body.email),
    password: String(body.password || "").trim(),
  };
}

function cleanSupplierPayload(body = {}) {
  return {
    name: cleanString(body.name, 140),
    contactName: cleanString(body.contactName, 140),
    email: normalizeEmail(body.email),
    phone: cleanString(body.phone, 40),
    status: ["active", "paused", "archived"].includes(body.status) ? body.status : "active",
  };
}

function cleanGymPayload(body = {}) {
  return {
    name: cleanString(body.name, 140),
    code: cleanString(body.code, 24).toUpperCase(),
    address: cleanString(body.address, 220),
    city: cleanString(body.city, 100),
    phone: cleanString(body.phone, 40),
    pickupEnabled: body.pickupEnabled !== false,
    status: ["active", "paused", "archived"].includes(body.status) ? body.status : "active",
    capacity: ["low", "medium", "high"].includes(body.capacity) ? body.capacity : "medium",
    membershipFee: Math.max(0, Number(body.membershipFee || 0)),
    paymentStatus: ["pending", "paid", "overdue"].includes(body.paymentStatus) ? body.paymentStatus : "pending",
  };
}

function cleanCouponPayload(body = {}) {
  return {
    code: cleanString(body.code, 40).toUpperCase(),
    title: cleanString(body.title, 140),
    description: cleanString(body.description, 280),
    type: body.type || "percentage",
    value: Number(body.value || 0),
    minSubtotal: Number(body.minSubtotal || 0),
    maxDiscount: Number(body.maxDiscount || 0),
    usageLimit: Number(body.usageLimit || 0),
    active: body.active !== false,
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
  };
}

function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
}

function cleanContentPayload(body = {}, userId) {
  const title = cleanString(body.title, 160);
  return {
    title,
    slug: slugify(body.slug || title),
    summary: cleanString(body.summary, 320),
    body: cleanString(body.body, 5000),
    type: body.type || "training",
    level: body.level || "beginner",
    readMinutes: Math.max(1, Number(body.readMinutes || 4)),
    tags: Array.isArray(body.tags)
      ? body.tags.map((tag) => cleanString(tag, 40)).filter(Boolean).slice(0, 8)
      : String(body.tags || "")
          .split(",")
          .map((tag) => cleanString(tag, 40))
          .filter(Boolean)
          .slice(0, 8),
    imageUrl: cleanString(body.imageUrl, 600),
    featured: Boolean(body.featured),
    status: body.status || "draft",
    relatedProducts: Array.isArray(body.relatedProducts) ? body.relatedProducts.filter(Boolean) : [],
    publishedAt: body.status === "published" ? body.publishedAt ? new Date(body.publishedAt) : new Date() : undefined,
    createdBy: userId,
  };
}

async function automationSummary() {
  const now = new Date();
  const paymentReminderBefore = new Date(now.getTime() - 30 * 60 * 1000);
  const [products, expiredCoupons, pendingPayments, overdueGyms, runs] = await Promise.all([
    Product.find({ status: { $ne: "archived" } }).populate("supplier").sort({ updatedAt: -1 }),
    Coupon.countDocuments({ active: true, endsAt: { $lte: now } }),
    Order.countDocuments({ status: "pending_payment", paymentStatus: "pending", createdAt: { $lte: paymentReminderBefore } }),
    Gym.countDocuments({ status: { $ne: "archived" }, paymentStatus: { $ne: "overdue" }, nextPaymentDue: { $lte: now } }),
    AutomationRun.find().populate("createdBy").sort({ createdAt: -1 }).limit(12),
  ]);

  const lowStockItems = products.flatMap((product) =>
    product.variants
      .filter((variant) => variant.stock < 10)
      .map((variant) => ({
        productId: product._id,
        productName: product.name,
        sku: variant.sku,
        variantLabel: variant.label,
        stock: variant.stock,
        supplier: product.supplier?.name || "Sin proveedor",
      }))
  );

  return {
    rules: automationRules,
    metrics: {
      expiredCoupons,
      lowStockItems: lowStockItems.length,
      pendingPayments,
      overdueGyms,
    },
    lowStockPreview: lowStockItems.sort((a, b) => a.stock - b.stock).slice(0, 6),
    runs,
  };
}

async function runExpiredCoupons() {
  const now = new Date();
  const coupons = await Coupon.find({ active: true, endsAt: { $lte: now } }).sort({ endsAt: 1 });
  if (coupons.length) {
    await Coupon.updateMany({ _id: { $in: coupons.map((coupon) => coupon._id) } }, { active: false });
    await createNotification({
      role: "admin",
      title: "Promociones vencidas pausadas",
      message: `${coupons.length} promoción(es) fueron pausadas automáticamente.`,
      type: "automation",
    });
  }
  return {
    rule: "expired_coupons",
    triggeredCount: coupons.length,
    changedCount: coupons.length,
    details: coupons.slice(0, 8).map((coupon) => ({ label: coupon.code, message: coupon.description })),
  };
}

async function runLowStockAlerts() {
  const products = await Product.find({ status: { $ne: "archived" } }).populate("supplier").sort({ updatedAt: -1 });
  const items = products.flatMap((product) =>
    product.variants
      .filter((variant) => variant.stock < 10)
      .map((variant) => ({
        label: `${product.name} · ${variant.label}`,
        message: `${variant.stock} pz disponibles · ${product.supplier?.name || "Sin proveedor"}`,
      }))
  );
  if (items.length) {
    await createNotification({
      role: "admin",
      title: "Stock bajo detectado",
      message: `${items.length} variante(s) necesitan revisión de inventario.`,
      type: "automation",
    });
  }
  return {
    rule: "low_stock_alerts",
    triggeredCount: items.length,
    changedCount: 0,
    details: items.slice(0, 8),
  };
}

async function runPaymentReminders() {
  const reminderBefore = new Date(Date.now() - 30 * 60 * 1000);
  const recentNotificationCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const orders = await Order.find({
    status: "pending_payment",
    paymentStatus: "pending",
    paymentMethod: "mercado_pago",
    createdAt: { $lte: reminderBefore },
  })
    .populate("customer")
    .sort({ createdAt: 1 })
    .limit(50);

  let sent = 0;
  const details = [];
  for (const order of orders) {
    const alreadySent = await Notification.exists({
      recipient: order.customer?._id || order.customer,
      linkType: "order",
      linkId: order._id,
      type: "payment_reminder",
      createdAt: { $gte: recentNotificationCutoff },
    });
    if (alreadySent) continue;
    await createNotification({
      recipient: order.customer?._id || order.customer,
      title: "Completa tu pago",
      message: `${order.orderNumber} sigue esperando pago en Mercado Pago.`,
      type: "payment_reminder",
      linkType: "order",
      linkId: order._id,
    });
    sent += 1;
    details.push({ label: order.orderNumber, message: order.customer?.email || "Cliente sin correo" });
  }

  if (sent) {
    await createNotification({
      role: "admin",
      title: "Recordatorios de pago enviados",
      message: `${sent} cliente(s) recibieron recordatorio para completar Mercado Pago.`,
      type: "automation",
    });
  }

  return {
    rule: "payment_reminders",
    triggeredCount: orders.length,
    changedCount: sent,
    details,
  };
}

async function runGymPaymentOverdue() {
  const now = new Date();
  const gyms = await Gym.find({ status: { $ne: "archived" }, paymentStatus: { $ne: "overdue" }, nextPaymentDue: { $lte: now } }).sort({
    nextPaymentDue: 1,
  });
  if (gyms.length) {
    await Gym.updateMany({ _id: { $in: gyms.map((gym) => gym._id) } }, { paymentStatus: "overdue" });
    await createNotification({
      role: "admin",
      title: "Afiliaciones vencidas",
      message: `${gyms.length} gimnasio(s) quedaron marcados con pago atrasado.`,
      type: "automation",
    });
  }
  return {
    rule: "gym_payment_overdue",
    triggeredCount: gyms.length,
    changedCount: gyms.length,
    details: gyms.slice(0, 8).map((gym) => ({ label: gym.name, message: `Venció ${formatDate(gym.nextPaymentDue)}` })),
  };
}

async function runAutomationRule(rule) {
  if (rule === "expired_coupons") return runExpiredCoupons();
  if (rule === "low_stock_alerts") return runLowStockAlerts();
  if (rule === "payment_reminders") return runPaymentReminders();
  if (rule === "gym_payment_overdue") return runGymPaymentOverdue();
  return null;
}

function publicAdminUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    adminRolePreset: user.adminRolePreset || "",
    permissions: user.permissions || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function publicRewardOrderForAdmin(order, viewer) {
  const json = order?.toJSON ? order.toJSON() : order;
  const includePrivate = viewer?.role === "admin";
  return {
    ...json,
    customer: publicCustomer(json.customer, { includePrivate }),
    pickupGym: publicGym(json.pickupGym, { includePrivate }),
    shippingAddress: includePrivate ? privateAddress(json.shippingAddress) : publicAddress(json.shippingAddress),
  };
}

function publicReturnForAdmin(returnRequest, viewer) {
  const json = returnRequest?.toJSON ? returnRequest.toJSON() : returnRequest;
  const includePrivate = viewer?.role === "admin";
  return {
    ...json,
    customer: publicCustomer(json.customer, { includePrivate }),
    order: publicOrder(json.order, { viewer, includePrivate }),
  };
}

function publicProductForAdmin(product, viewer) {
  const json = product?.toJSON ? product.toJSON() : product;
  return {
    ...json,
    supplier: json.supplier && typeof json.supplier === "object" ? publicSupplier(json.supplier, { includePrivate: viewer?.role === "admin" }) : json.supplier,
  };
}

async function cleanStaffPayload(body, existingUser = null) {
  const name = cleanString(body.name, 120);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const adminRolePreset = String(body.adminRolePreset || ADMIN_ROLE_PRESETS[0].key);
  const preset = ADMIN_ROLE_PRESETS.find((entry) => entry.key === adminRolePreset);
  const status = body.status === "disabled" ? "disabled" : "active";

  if (!name || !email) return { status: 400, message: "Nombre y correo son requeridos" };
  if (!isEmail(email)) return { status: 400, message: "Correo inválido" };
  if (!preset) return { status: 400, message: "Grupo de funciones inválido" };
  if (!existingUser && !isStrongEnoughPassword(password)) {
    return { status: 400, message: "La contraseña debe tener al menos 8 caracteres, letras y números" };
  }
  if (password && !isStrongEnoughPassword(password)) {
    return { status: 400, message: "La contraseña debe tener al menos 8 caracteres, letras y números" };
  }

  const exists = await User.exists(existingUser ? { email, _id: { $ne: existingUser._id } } : { email });
  if (exists) return { status: 409, message: "El correo ya está en uso" };

  const payload = {
    name,
    email,
    role: "staff",
    status,
    adminRolePreset: preset.key,
    permissions: permissionsForPreset(preset.key),
  };
  if (password) payload.passwordHash = await bcrypt.hash(password, 10);
  return { payload };
}

adminRouter.get("/users", requireRole("admin"), async (_request, response) => {
  const users = await User.find({ role: { $in: ["admin", "staff"] } }).select("-passwordHash").sort({ role: 1, name: 1 });
  response.json({ users: users.map(publicAdminUser), rolePresets: ADMIN_ROLE_PRESETS });
});

adminRouter.post("/users", requireRole("admin"), async (request, response) => {
  const result = await cleanStaffPayload(request.body);
  if (result.status) return response.status(result.status).json({ message: result.message });
  const user = await User.create(result.payload);
  await writeAuditLog(request, { action: "admin_user.create", resource: "user", resourceId: user._id, metadata: { email: user.email, preset: user.adminRolePreset } });
  response.status(201).json({ user: publicAdminUser(user) });
});

adminRouter.patch("/users/:id", requireRole("admin"), async (request, response) => {
  const user = await User.findById(request.params.id);
  if (!user) return response.status(404).json({ message: "Usuario no encontrado" });
  if (user.role === "admin") return response.status(403).json({ message: "El administrador principal no se edita desde roles" });

  const result = await cleanStaffPayload(request.body, user);
  if (result.status) return response.status(result.status).json({ message: result.message });
  Object.assign(user, result.payload);
  await user.save();
  await writeAuditLog(request, { action: "admin_user.update", resource: "user", resourceId: user._id, metadata: { status: user.status, preset: user.adminRolePreset } });
  response.json({ user: publicAdminUser(user) });
});

adminRouter.get("/stats", async (_request, response) => {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [orders, customers, products, gyms, suppliers, restocks, rewardOrders] = await Promise.all([
    Order.find(),
    User.countDocuments({ role: "customer" }),
    Product.find().populate("category supplier"),
    Gym.find({ status: { $ne: "archived" } }),
    Supplier.find({ status: { $ne: "archived" } }),
    StockMovement.find({ createdAt: { $gte: previousStart } }),
    RewardOrder.find(),
  ]);

  const paidOrders = orders.filter((order) => order.status !== "cancelled");
  const revenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const costOfGoods = paidOrders.reduce(
    (sum, order) => sum + order.items.reduce((inner, item) => inner + (item.cost || 0) * item.quantity, 0),
    0
  );
  const profit = revenue - costOfGoods;
  const currentOrders = paidOrders.filter((order) => order.createdAt >= currentStart);
  const previousOrders = paidOrders.filter((order) => order.createdAt >= previousStart && order.createdAt < currentStart);
  const currentProfit = currentOrders.reduce(
    (sum, order) => sum + order.items.reduce((inner, item) => inner + (item.price - (item.cost || 0)) * item.quantity, 0) + order.shippingFee,
    0
  );
  const previousProfit = previousOrders.reduce(
    (sum, order) => sum + order.items.reduce((inner, item) => inner + (item.price - (item.cost || 0)) * item.quantity, 0) + order.shippingFee,
    0
  );
  const restockSpend = restocks.filter((movement) => movement.createdAt >= currentStart).reduce((sum, movement) => sum + movement.totalCost, 0);
  const lowStock = products.filter((product) => product.variants.some((variant) => variant.stock < 10)).length;
  const activeGyms = gyms.filter((gym) => gym.status === "active").length;
  const inactiveGyms = gyms.filter((gym) => gym.status !== "active").length;
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === "active").length;
  const inactiveSuppliers = suppliers.filter((supplier) => supplier.status !== "active").length;
  const pendingOrderPayments = orders.filter((order) => order.paymentStatus === "pending").length;
  const paidOrderPayments = orders.filter((order) => order.paymentStatus === "paid").length;
  const pendingGymPayments = gyms.filter((gym) => gym.paymentStatus !== "paid").length;
  const paidGymPayments = gyms.filter((gym) => gym.paymentStatus === "paid").length;

  response.json({
    stats: {
      revenue,
      profit,
      currentProfit,
      previousProfit,
      profitDelta: currentProfit - previousProfit,
      restockSpend,
      activeOrders: orders.filter((order) => ["paid", "preparing", "ready_for_pickup", "in_transit"].includes(order.status)).length,
      completedOrders: orders.filter((order) => order.status === "delivered").length,
      customers,
      products: products.length,
      lowStock,
      gyms: activeGyms,
      activeGyms,
      inactiveGyms,
      activeSuppliers,
      inactiveSuppliers,
      pendingOrderPayments,
      paidOrderPayments,
      pendingGymPayments,
      paidGymPayments,
      rewardOrders: rewardOrders.length,
    },
  });
});

adminRouter.get("/analytics", async (request, response) => {
  const analytics = await buildAnalytics(request.user);
  response.json({ analytics });
});

adminRouter.get("/finance", async (_request, response) => {
  response.json({ finance: await buildFinanceSummary() });
});

adminRouter.get("/audit-logs", async (_request, response) => {
  const logs = await AuditLog.find()
    .populate("actor", "name email role")
    .sort({ createdAt: -1 })
    .limit(120);
  response.json({ logs: logs.map(publicAuditLog) });
});

adminRouter.get("/support", async (request, response) => {
  const tickets = await SupportTicket.find()
    .populate("customer", "name email")
    .populate("order", "orderNumber total status paymentStatus")
    .populate("assignedTo", "name email role")
    .sort({ updatedAt: -1 })
    .limit(120);
  response.json({ tickets: tickets.map((ticket) => publicSupportTicket(ticket, request.user.role === "admin")) });
});

adminRouter.patch("/support/:id", async (request, response) => {
  const ticket = await SupportTicket.findById(request.params.id).populate("customer", "name email");
  if (!ticket) return response.status(404).json({ message: "Ticket no encontrado" });

  const status = String(request.body.status || ticket.status);
  const priority = String(request.body.priority || ticket.priority);
  const reply = cleanString(request.body.reply, 1200);
  if (!["open", "waiting_customer", "waiting_team", "resolved"].includes(status)) return response.status(400).json({ message: "Estado inválido" });
  if (!["low", "normal", "high"].includes(priority)) return response.status(400).json({ message: "Prioridad inválida" });

  ticket.status = status;
  ticket.priority = priority;
  ticket.assignedTo = request.user._id;
  if (status === "resolved") ticket.resolvedAt = new Date();
  if (reply) {
    ticket.messages.push({ author: request.user._id, authorRole: request.user.role === "admin" ? "admin" : "staff", message: reply });
    ticket.status = status === "resolved" ? "resolved" : "waiting_customer";
  }
  await ticket.save();

  await createNotification({
    recipient: ticket.customer?._id || ticket.customer,
    title: reply ? "Soporte respondió tu ticket" : "Ticket actualizado",
    message: `${ticket.ticketNumber}: ${ticket.subject}`,
    type: "support",
    linkType: "support",
    linkId: ticket._id,
  });
  await writeAuditLog(request, { action: "support_ticket.update", resource: "support_ticket", resourceId: ticket._id, metadata: { status: ticket.status, priority: ticket.priority } });

  await ticket.populate("order", "orderNumber total status paymentStatus");
  await ticket.populate("assignedTo", "name email role");
  response.json({ ticket: publicSupportTicket(ticket, request.user.role === "admin") });
});

adminRouter.get("/legal-documents", async (_request, response) => {
  const documents = await ensureDefaultLegalDocuments();
  response.json({ documents });
});

adminRouter.patch("/legal-documents/:id", async (request, response) => {
  const payload = cleanLegalPayload(request.body, request.user._id);
  if (!payload.title || !payload.intro || !payload.blocks.length) {
    return response.status(400).json({ message: "Título, introducción y al menos un bloque son requeridos" });
  }
  const document = await versionedFindByIdAndUpdate(LegalDocument, request.params.id, payload);
  if (!document) return response.status(404).json({ message: "Documento no encontrado" });
  await writeAuditLog(request, { action: "legal_document.update", resource: "legal_document", resourceId: document._id, metadata: { key: document.key, status: document.status } });
  response.json({ document });
});

adminRouter.post("/notifications", async (request, response) => {
  const title = cleanString(request.body.title, 120);
  const message = cleanString(request.body.message, 500);
  const audience = ["admin", "staff", "customer", "gym"].includes(request.body.audience) ? request.body.audience : "customer";
  if (!title || !message) return response.status(400).json({ message: "Título y mensaje son requeridos" });

  await createNotification({ role: audience, title, message, type: "broadcast", linkType: "notification" });
  await writeAuditLog(request, { action: "notification.broadcast", resource: "notification", metadata: { audience, title } });
  response.status(201).json({ ok: true });
});

adminRouter.get("/automations", async (_request, response) => {
  response.json({ automations: await automationSummary() });
});

adminRouter.post("/automations/run", async (request, response) => {
  const selectedRule = String(request.body.rule || "all");
  const ruleIds = selectedRule === "all" ? automationRules.map((rule) => rule.id) : [selectedRule];
  if (ruleIds.some((rule) => !automationRules.some((entry) => entry.id === rule))) {
    return response.status(400).json({ message: "Automatización inválida" });
  }

  const results = [];
  for (const rule of ruleIds) {
    const result = await runAutomationRule(rule);
    if (result) results.push(result);
  }

  const triggeredCount = results.reduce((sum, result) => sum + result.triggeredCount, 0);
  const changedCount = results.reduce((sum, result) => sum + result.changedCount, 0);
  const run = await AutomationRun.create({
    rule: selectedRule,
    status: "completed",
    summary: `${results.length} regla(s), ${triggeredCount} hallazgo(s), ${changedCount} cambio(s).`,
    triggeredCount,
    changedCount,
    details: results.flatMap((result) => result.details.map((detail) => ({ ...detail, label: `${result.rule}: ${detail.label}` }))).slice(0, 20),
    createdBy: request.user._id,
  });
  await run.populate("createdBy");

  response.json({ run, automations: await automationSummary() });
});

adminRouter.get("/content", async (request, response) => {
  const archived = request.query.archived === "1" || request.query.archived === "true";
  const posts = await ContentPost.find(archived ? { status: "archived" } : { status: { $ne: "archived" } })
    .populate("relatedProducts", "name slug variants")
    .populate("createdBy", "name")
    .sort({ updatedAt: -1 });
  response.json({ posts });
});

adminRouter.post("/content", async (request, response) => {
  const payload = cleanContentPayload(request.body, request.user._id);
  if (!payload.title || !payload.summary || !payload.body) {
    return response.status(400).json({ message: "Título, resumen y contenido son requeridos" });
  }
  if (!payload.slug) return response.status(400).json({ message: "Slug inválido" });
  if (!["training", "nutrition", "recovery", "lifestyle"].includes(payload.type)) {
    return response.status(400).json({ message: "Tipo de contenido inválido" });
  }
  if (!["beginner", "intermediate", "advanced"].includes(payload.level)) {
    return response.status(400).json({ message: "Nivel inválido" });
  }
  if (!["draft", "published"].includes(payload.status)) return response.status(400).json({ message: "Estado inválido" });

  const post = await ContentPost.create(payload);
  await post.populate("relatedProducts", "name slug variants");
  response.status(201).json({ post });
});

adminRouter.patch("/content/:id", async (request, response) => {
  const existing = await ContentPost.findById(request.params.id);
  if (!existing || existing.status === "archived") return response.status(404).json({ message: "Contenido no encontrado" });

  const payload = cleanContentPayload(request.body, existing.createdBy || request.user._id);
  if (!payload.title || !payload.summary || !payload.body) {
    return response.status(400).json({ message: "Título, resumen y contenido son requeridos" });
  }
  if (!payload.slug) return response.status(400).json({ message: "Slug inválido" });
  if (!["training", "nutrition", "recovery", "lifestyle"].includes(payload.type)) {
    return response.status(400).json({ message: "Tipo de contenido inválido" });
  }
  if (!["beginner", "intermediate", "advanced"].includes(payload.level)) {
    return response.status(400).json({ message: "Nivel inválido" });
  }
  if (!["draft", "published"].includes(payload.status)) return response.status(400).json({ message: "Estado inválido" });
  if (payload.status === "published" && existing.status === "published" && existing.publishedAt) payload.publishedAt = existing.publishedAt;

  const post = await versionedFindByIdAndUpdate(ContentPost, request.params.id, payload, { populate: { path: "relatedProducts", select: "name slug variants" } });
  response.json({ post });
});

adminRouter.delete("/content/:id", async (request, response) => {
  const post = await ContentPost.findByIdAndUpdate(request.params.id, { status: "archived" }, { new: true });
  if (!post) return response.status(404).json({ message: "Contenido no encontrado" });
  response.json({ post });
});

adminRouter.patch("/content/:id/restore", async (request, response) => {
  const post = await ContentPost.findOneAndUpdate({ _id: request.params.id, status: "archived" }, { status: "draft" }, { new: true })
    .populate("relatedProducts", "name slug variants")
    .populate("createdBy", "name");
  if (!post) return response.status(404).json({ message: "Guía archivada no encontrada" });
  response.json({ post });
});

adminRouter.get("/inventory", async (request, response) => {
  const products = await Product.find({ status: { $ne: "archived" } }).populate("category supplier").sort({ updatedAt: -1 });
  response.json({ products: products.map((product) => publicProductForAdmin(product, request.user)) });
});

adminRouter.post("/uploads/images", async (request, response) => {
  const parsed = parseImagePayload(request.body || {});
  if (!parsed) return response.status(400).json({ message: "Sube una imagen PNG, JPG o WebP válida" });
  if (parsed.buffer.length > 4 * 1024 * 1024) {
    return response.status(413).json({ message: "La imagen no debe superar 4 MB" });
  }

  const url = await uploadImageAsset({
    dataUrl: parsed.dataUrl,
    filename: parsed.filename,
    folder: "gymverse/products",
  });
  response.status(201).json({ url });
});

adminRouter.post("/products", async (request, response) => {
  const product = await Product.create(request.body);
  await product.populate("category supplier");
  response.status(201).json({ product: publicProductForAdmin(product, request.user) });
});

adminRouter.patch("/products/:id", async (request, response) => {
  const product = await versionedFindByIdAndUpdate(Product, request.params.id, request.body, { populate: "category supplier" });
  if (!product) return response.status(404).json({ message: "Producto no encontrado" });
  response.json({ product: publicProductForAdmin(product, request.user) });
});

adminRouter.patch("/products/:id/stock", async (request, response) => {
  const { sku, delta = 0, unitCost = 0, note = "" } = request.body;
  const movement = Number(delta);
  if (!Number.isFinite(movement) || movement === 0) return response.status(400).json({ message: "Movimiento inválido" });

  await withTransaction(async (session) => {
    const product = await Product.findById(request.params.id).session(session);
    if (!product) throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
    const variant = product.variants.find((item) => item.sku === sku);
    if (!variant) throw Object.assign(new Error("Variante no encontrada"), { status: 404 });

    const filter = { _id: product._id, variants: { $elemMatch: { sku } } };
    if (movement < 0) filter.variants.$elemMatch.stock = { $gte: Math.abs(movement) };
    const update = { $inc: { "variants.$.stock": movement } };
    const parsedCost = Number(unitCost) || variant.cost || 0;
    if (movement > 0) update.$set = { "variants.$.cost": parsedCost };

    const result = await Product.updateOne(filter, update, { session });
    if (!result.modifiedCount) throw conflict("Stock insuficiente para aplicar el movimiento");

    if (movement > 0) {
      await StockMovement.create(
        [
          {
            product: product._id,
            productName: product.name,
            sku: variant.sku,
            variantLabel: variant.label,
            supplier: product.supplier,
            quantity: movement,
            unitCost: parsedCost,
            totalCost: parsedCost * movement,
            note,
            createdBy: request.user._id,
          },
        ],
        { session }
      );
    }
  });

  const product = await Product.findById(request.params.id).populate("category supplier");
  if (!product) return response.status(404).json({ message: "Producto no encontrado" });
  response.json({ product: publicProductForAdmin(product, request.user) });
});

adminRouter.get("/restocks", async (_request, response) => {
  const restocks = await StockMovement.find().populate("product supplier createdBy").sort({ createdAt: -1 }).limit(100);
  response.json({ restocks });
});

adminRouter.get("/restock-guides", async (_request, response) => {
  const restockGuides = await RestockGuide.find().sort({ createdAt: -1 }).limit(100);
  response.json({ restockGuides });
});

adminRouter.get("/gym-stock", async (request, response) => {
  const filter = request.query.gym ? { gym: request.query.gym } : {};
  const stock = await GymStock.find(filter).populate("gym product").sort({ "gym.name": 1, productName: 1, variantLabel: 1 }).limit(300);
  response.json({ stock });
});

adminRouter.get("/gym-restock-requests", async (_request, response) => {
  const requests = await GymRestockRequest.find().populate("gym requestedBy confirmedBy").sort({ createdAt: -1 }).limit(100);
  response.json({ requests });
});

adminRouter.patch("/gym-restock-requests/:id/confirm", async (request, response) => {
  if (!request.params.id.match(/^[a-f\d]{24}$/i)) return response.status(400).json({ message: "Solicitud inválida" });
  const adminNote = cleanString(request.body.adminNote, 500);
  const restockRequest = await GymRestockRequest.findById(request.params.id).populate("gym");
  if (!restockRequest) return response.status(404).json({ message: "Solicitud no encontrada" });
  if (restockRequest.status !== "requested") return response.status(409).json({ message: "Esta solicitud ya fue procesada" });
  if (!restockRequest.items?.length) return response.status(400).json({ message: "La solicitud no tiene productos" });
  if (!restockRequest.gym || restockRequest.gym.status === "archived") return response.status(409).json({ message: "El gimnasio ya no está activo" });

  await withTransaction(async (session) => {
    const freshRequest = await GymRestockRequest.findById(restockRequest._id).session(session);
    if (!freshRequest || freshRequest.status !== "requested") throw conflict("Esta solicitud ya fue procesada");

    for (const item of freshRequest.items || []) {
      const product = await Product.findById(item.product).session(session);
      const variant = product?.variants.find((entry) => entry.sku === item.sku);
      if (!product || !variant) throw Object.assign(new Error(`${item.productName} ya no está disponible`), { status: 404 });

      const localStock = await GymStock.findOne({ gym: freshRequest.gym, product: item.product, sku: item.sku }).session(session);
      if (Number(localStock?.quantity || 0) + Number(item.quantity || 0) > 10) {
        throw conflict(`${item.productName} ${item.variantLabel} supera el máximo de 10 piezas en el gimnasio`);
      }

      const centralResult = await Product.updateOne(
        { _id: product._id, variants: { $elemMatch: { sku: item.sku, stock: { $gte: item.quantity } } } },
        { $inc: { "variants.$.stock": -item.quantity } },
        { session }
      );
      if (!centralResult.modifiedCount) throw conflict(`Stock central insuficiente para ${item.productName}`);

      await GymStock.updateOne(
        { gym: freshRequest.gym, product: item.product, sku: item.sku },
        {
          $setOnInsert: {
            gym: freshRequest.gym,
            product: item.product,
            productName: item.productName,
            sku: item.sku,
            variantLabel: item.variantLabel,
          },
          $inc: { quantity: item.quantity },
        },
        { session, upsert: true }
      );

      await StockMovement.create(
        [
          {
            product: product._id,
            productName: product.name,
            sku: item.sku,
            variantLabel: item.variantLabel,
            supplier: product.supplier,
            quantity: -item.quantity,
            unitCost: variant.cost || 0,
            totalCost: 0,
            note: `Traslado a gimnasio: ${freshRequest.requestNumber}`,
            createdBy: request.user._id,
          },
        ],
        { session }
      );
    }

    freshRequest.status = "transferred";
    freshRequest.adminNote = adminNote;
    freshRequest.confirmedBy = request.user._id;
    freshRequest.confirmedAt = new Date();
    await freshRequest.save({ session });
  });

  const updated = await GymRestockRequest.findById(request.params.id).populate("gym requestedBy confirmedBy");
  const gymUser = await User.findOne({ role: "gym", gym: updated.gym?._id || updated.gym, status: { $ne: "disabled" } }).select("_id");
  if (gymUser) {
    await createNotification({
      recipient: gymUser._id,
      title: "Traslado de reabastecimiento confirmado",
      message: `${updated.requestNumber} fue confirmado. El stock local del gimnasio ya fue actualizado.`,
      type: "gym_restock",
      linkType: "gym_restock",
      linkId: updated._id,
    });
  }
  await writeAuditLog(request, { action: "gym_restock.confirm", resource: "gym_restock_request", resourceId: updated._id, metadata: { requestNumber: updated.requestNumber } });
  response.json({ request: updated });
});

adminRouter.patch("/gym-restock-requests/:id/cancel", async (request, response) => {
  if (!request.params.id.match(/^[a-f\d]{24}$/i)) return response.status(400).json({ message: "Solicitud inválida" });
  const adminNote = cleanString(request.body.adminNote, 500);
  const restockRequest = await GymRestockRequest.findById(request.params.id);
  if (!restockRequest) return response.status(404).json({ message: "Solicitud no encontrada" });
  if (restockRequest.status !== "requested") return response.status(409).json({ message: "Esta solicitud ya fue procesada" });
  restockRequest.status = "cancelled";
  restockRequest.adminNote = adminNote;
  restockRequest.confirmedBy = request.user._id;
  restockRequest.confirmedAt = new Date();
  await restockRequest.save();
  await writeAuditLog(request, { action: "gym_restock.cancel", resource: "gym_restock_request", resourceId: restockRequest._id, metadata: { requestNumber: restockRequest.requestNumber } });
  response.json({ request: await GymRestockRequest.findById(request.params.id).populate("gym requestedBy confirmedBy") });
});

adminRouter.post("/restock-guides/pdf", async (request, response) => {
  const guide = await buildRestockGuide(request.body.items);
  if (guide.message) return response.status(guide.status).json({ message: guide.message });

  const restockGuide = await RestockGuide.create({
    guideNumber: guide.guideNumber,
    items: guide.items,
    totalItems: guide.totalItems,
    totalCost: guide.totalCost,
    createdBy: request.user._id,
  });

  sendPdf(response, `${restockGuide.guideNumber}.pdf`, createRestockGuidePdf(restockGuide));
});

adminRouter.get("/restock-guides/:id/pdf", async (request, response) => {
  const restockGuide = await RestockGuide.findById(request.params.id);
  if (!restockGuide) return response.status(404).json({ message: "Guía no encontrada" });
  sendPdf(response, `${restockGuide.guideNumber}.pdf`, createRestockGuidePdf(restockGuide));
});

adminRouter.get("/reward-drops", async (_request, response) => {
  const drops = await RewardDrop.find({ status: { $ne: "archived" } })
    .populate({ path: "items.product", populate: "category supplier" })
    .sort({ updatedAt: -1 });
  response.json({ drops });
});

adminRouter.get("/coupons", async (_request, response) => {
  const coupons = await Coupon.find().sort({ updatedAt: -1 });
  response.json({ coupons });
});

adminRouter.post("/coupons", async (request, response) => {
  const payload = cleanCouponPayload(request.body);
  if (!payload.code || !payload.description) return response.status(400).json({ message: "Código y descripción son requeridos" });
  if (!["percentage", "fixed", "free_shipping"].includes(payload.type)) {
    return response.status(400).json({ message: "Tipo de promoción inválido" });
  }
  if (payload.type === "percentage" && (payload.value <= 0 || payload.value > 100)) {
    return response.status(400).json({ message: "El porcentaje debe estar entre 1 y 100" });
  }
  if (payload.type === "fixed" && payload.value <= 0) return response.status(400).json({ message: "El descuento debe ser mayor a cero" });
  const coupon = await Coupon.create(payload);
  response.status(201).json({ coupon });
});

adminRouter.patch("/coupons/:id", async (request, response) => {
  const payload = cleanCouponPayload(request.body);
  if (!payload.code || !payload.description) return response.status(400).json({ message: "Código y descripción son requeridos" });
  if (!["percentage", "fixed", "free_shipping"].includes(payload.type)) {
    return response.status(400).json({ message: "Tipo de promoción inválido" });
  }
  if (payload.type === "percentage" && (payload.value <= 0 || payload.value > 100)) {
    return response.status(400).json({ message: "El porcentaje debe estar entre 1 y 100" });
  }
  if (payload.type === "fixed" && payload.value <= 0) return response.status(400).json({ message: "El descuento debe ser mayor a cero" });
  const coupon = await versionedFindByIdAndUpdate(Coupon, request.params.id, payload);
  if (!coupon) return response.status(404).json({ message: "Promoción no encontrada" });
  response.json({ coupon });
});

adminRouter.patch("/coupons/:id/status", async (request, response) => {
  const coupon = await Coupon.findByIdAndUpdate(request.params.id, { active: request.body.active !== false }, { new: true });
  if (!coupon) return response.status(404).json({ message: "Promoción no encontrada" });
  response.json({ coupon });
});

adminRouter.post("/reward-drops", async (request, response) => {
  const payload = cleanDropPayload(request.body, request.user._id);
  if (!payload.title) return response.status(400).json({ message: "Título requerido" });
  if (!payload.items.length) return response.status(400).json({ message: "Agrega al menos un producto" });
  if (payload.status === "active") await RewardDrop.updateMany({ status: "active" }, { status: "draft" });
  const drop = await RewardDrop.create(payload);
  await drop.populate({ path: "items.product", populate: "category supplier" });
  response.status(201).json({ drop });
});

adminRouter.patch("/reward-drops/:id", async (request, response) => {
  const payload = cleanDropPayload(request.body, request.user._id);
  if (payload.status === "active") await RewardDrop.updateMany({ _id: { $ne: request.params.id }, status: "active" }, { status: "draft" });
  const drop = await versionedFindByIdAndUpdate(RewardDrop, request.params.id, payload, { populate: {
    path: "items.product",
    populate: "category supplier",
  } });
  if (!drop) return response.status(404).json({ message: "Drop no encontrado" });
  response.json({ drop });
});

adminRouter.get("/reward-orders", async (request, response) => {
  const rewardOrders = await RewardOrder.find()
    .populate("customer pickupGym drop")
    .sort({ createdAt: -1 })
    .limit(100);
  response.json({ rewardOrders: rewardOrders.map((order) => publicRewardOrderForAdmin(order, request.user)) });
});

adminRouter.get("/returns", async (request, response) => {
  const returnRequests = await ReturnRequest.find()
    .populate("customer order")
    .sort({ createdAt: -1 })
    .limit(120);
  response.json({ returnRequests: returnRequests.map((item) => publicReturnForAdmin(item, request.user)) });
});

adminRouter.patch("/returns/:id", async (request, response) => {
  const allowed = ["requested", "approved", "rejected", "received", "refunded"];
  const status = String(request.body.status || "");
  if (!allowed.includes(status)) return response.status(400).json({ message: "Estado de devolución inválido" });

  const returnRequest = await ReturnRequest.findById(request.params.id).populate("customer order");
  if (!returnRequest) return response.status(404).json({ message: "Solicitud no encontrada" });

  returnRequest.status = status;
  returnRequest.resolutionNote = String(request.body.resolutionNote || returnRequest.resolutionNote || "").trim();
  if (["rejected", "refunded"].includes(status)) returnRequest.resolvedAt = new Date();

  if (status === "refunded" && returnRequest.order) {
    returnRequest.order.status = "returned";
    returnRequest.order.paymentStatus = "refunded";
    await returnRequest.order.save();
  }

  await returnRequest.save();
  await createNotification({
    recipient: returnRequest.customer?._id || returnRequest.customer,
    title: "Devolución actualizada",
    message: `${returnRequest.returnNumber} cambió a ${status}.`,
    type: "return",
    linkType: "return",
    linkId: returnRequest._id,
  });

  await returnRequest.populate("customer order");
  response.json({ returnRequest: publicReturnForAdmin(returnRequest, request.user) });
});

adminRouter.patch("/reward-orders/:id/status", async (request, response) => {
  const allowed = ["requested", "preparing", "ready_for_pickup", "in_transit", "delivered", "cancelled"];
  if (!allowed.includes(request.body.status)) return response.status(400).json({ message: "Estado inválido" });
  const rewardOrder = await RewardOrder.findByIdAndUpdate(request.params.id, { status: request.body.status }, { new: true })
    .populate("customer pickupGym drop");
  if (!rewardOrder) return response.status(404).json({ message: "Pedido de recompensa no encontrado" });
  response.json({ rewardOrder: publicRewardOrderForAdmin(rewardOrder, request.user) });
});

adminRouter.get("/reward-orders/:id/guide.pdf", async (request, response) => {
  const rewardOrder = await RewardOrder.findById(request.params.id).populate("customer pickupGym drop");
  if (!rewardOrder) return response.status(404).json({ message: "Pedido de recompensa no encontrado" });

  const address = rewardOrder.shippingAddress || {};
  const lines = [
    "GymVerse - Guía de recompensa",
    `Pedido: ${rewardOrder.rewardNumber}`,
    `Cliente: ${rewardOrder.customer?.name || "Sin cliente"}`,
    `Correo: ${rewardOrder.customer?.email || ""}`,
    `Método: ${rewardOrder.deliveryMethod === "home" ? "Domicilio" : "Retiro en gimnasio"}`,
    rewardOrder.deliveryMethod === "home"
      ? `Destino: ${address.street || ""}, ${address.city || ""}, ${address.state || ""}, CP ${address.zip || ""}`
      : `Punto de retiro: ${rewardOrder.pickupGym?.name || ""}`,
    `Teléfono: ${address.phone || ""}`,
    "",
    "Productos:",
    ...rewardOrder.items.map(
      (item) => `${item.quantity} x ${item.productName} - ${item.variantLabel} (${item.sku}) - ${item.pointsCost} pts c/u`
    ),
    "",
    `Subtotal: ${rewardOrder.totalPoints} pts`,
    "Envío: 0 pts",
    `Total: ${rewardOrder.totalPoints} pts`,
    "",
    "Notas: canje generado con puntos GymVerse.",
  ];

  sendPdf(response, `${rewardOrder.rewardNumber}-guia.pdf`, createSimplePdf(lines));
});

adminRouter.get("/reports/:kind.pdf", async (request, response) => {
  const { kind } = request.params;
  const report = await getReportRows(kind, request.user);
  if (!report) return response.status(404).json({ message: "Reporte no disponible" });

  const totalAmount = report.rows.reduce((sum, row) => sum + Number(row.total || row.amount || row.totalCost || 0), 0);
  const pdf = createDocumentPdf({
    title: report.title,
    subtitle: `gymverse-${kind}`,
    sections: [
      {
        heading: "Resumen",
        rows: [`Registros: ${report.rows.length}`, `Monto relacionado: ${formatMoney(totalAmount)}`, `Generado: ${formatDate(new Date())}`],
      },
      {
        heading: "Detalle",
        rows: report.rows.map((row) => reportRowText(kind, row)),
      },
    ],
  });

  sendPdf(response, `gymverse-${kind}.pdf`, pdf);
});

adminRouter.get("/reports/:kind.csv", async (request, response) => {
  const { kind } = request.params;
  const report = await getReportRows(kind, request.user);
  if (!report) return response.status(404).json({ message: "Reporte no disponible" });
  sendCsv(response, `gymverse-${kind}.csv`, report.rows);
});

adminRouter.delete("/products/:id", async (request, response) => {
  const product = await Product.findByIdAndUpdate(request.params.id, { status: "archived" }, { new: true });
  if (!product) return response.status(404).json({ message: "Producto no encontrado" });
  response.json({ product });
});

adminRouter.get("/suppliers", async (request, response) => {
  const suppliers = await Supplier.find({ status: { $ne: "archived" } }).sort({ name: 1 });
  response.json({ suppliers: suppliers.map((supplier) => publicSupplier(supplier, { includePrivate: request.user.role === "admin" })) });
});

adminRouter.post("/suppliers", async (request, response) => {
  const payload = cleanSupplierPayload(request.body);
  if (!payload.name) return response.status(400).json({ message: "Nombre de proveedor requerido" });
  if (payload.email && !isEmail(payload.email)) return response.status(400).json({ message: "Correo inválido" });
  const supplier = await Supplier.create(payload);
  await writeAuditLog(request, { action: "supplier.create", resource: "supplier", resourceId: supplier._id, metadata: { name: supplier.name } });
  response.status(201).json({ supplier: publicSupplier(supplier, { includePrivate: request.user.role === "admin" }) });
});

adminRouter.patch("/suppliers/:id", async (request, response) => {
  const payload = cleanSupplierPayload(request.body);
  if (!payload.name) return response.status(400).json({ message: "Nombre de proveedor requerido" });
  if (payload.email && !isEmail(payload.email)) return response.status(400).json({ message: "Correo inválido" });
  const supplier = await versionedFindByIdAndUpdate(Supplier, request.params.id, payload);
  if (!supplier) return response.status(404).json({ message: "Proveedor no encontrado" });
  await writeAuditLog(request, { action: "supplier.update", resource: "supplier", resourceId: supplier._id, metadata: { name: supplier.name, status: supplier.status } });
  response.json({ supplier: publicSupplier(supplier, { includePrivate: request.user.role === "admin" }) });
});

adminRouter.delete("/suppliers/:id", async (request, response) => {
  const supplier = await Supplier.findByIdAndUpdate(request.params.id, { status: "archived" }, { new: true });
  if (!supplier) return response.status(404).json({ message: "Proveedor no encontrado" });
  await writeAuditLog(request, { action: "supplier.archive", resource: "supplier", resourceId: supplier._id, metadata: { name: supplier.name } });
  response.json({ supplier: publicSupplier(supplier, { includePrivate: request.user.role === "admin" }) });
});

adminRouter.get("/gyms", async (request, response) => {
  const gyms = await Gym.find({ status: { $ne: "archived" } }).sort({ name: 1 });
  const attached = await attachGymAccess(gyms);
  response.json({ gyms: attached.map((gym) => publicGym(gym, { includePrivate: request.user.role === "admin" })) });
});

adminRouter.post("/gyms", async (request, response) => {
  const payload = cleanGymPayload(request.body);
  if (!payload.name || !payload.code || !payload.address || !payload.city) return response.status(400).json({ message: "Nombre, código, ciudad y dirección son requeridos" });
  const gym = await Gym.create(payload);
  await writeAuditLog(request, { action: "gym.create", resource: "gym", resourceId: gym._id, metadata: { name: gym.name, code: gym.code } });
  response.status(201).json({ gym: publicGym(await attachGymAccess(gym), { includePrivate: request.user.role === "admin" }) });
});

adminRouter.patch("/gyms/:id", async (request, response) => {
  const payload = cleanGymPayload(request.body);
  if (!payload.name || !payload.code || !payload.address || !payload.city) return response.status(400).json({ message: "Nombre, código, ciudad y dirección son requeridos" });
  const gym = await versionedFindByIdAndUpdate(Gym, request.params.id, payload);
  if (!gym) return response.status(404).json({ message: "Gimnasio no encontrado" });
  await writeAuditLog(request, { action: "gym.update", resource: "gym", resourceId: gym._id, metadata: { name: gym.name, status: gym.status, paymentStatus: gym.paymentStatus } });
  response.json({ gym: publicGym(await attachGymAccess(gym), { includePrivate: request.user.role === "admin" }) });
});

adminRouter.post("/gyms/:id/access", async (request, response) => {
  const gym = await Gym.findById(request.params.id);
  if (!gym || gym.status === "archived") return response.status(404).json({ message: "Gimnasio no encontrado" });

  const payload = cleanGymAccessPayload(request.body);
  if (!payload.name || !payload.email || !payload.password) {
    return response.status(400).json({ message: "Nombre, correo y contraseña son requeridos" });
  }
  if (!isEmail(payload.email)) return response.status(400).json({ message: "Correo inválido" });
  if (!isStrongEnoughPassword(payload.password)) return response.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres, letras y números" });

  const existingGymAccess = await User.findOne({ role: "gym", gym: gym._id });
  if (existingGymAccess) return response.status(409).json({ message: "Este gimnasio ya tiene acceso" });

  const emailTaken = await User.exists({ email: payload.email });
  if (emailTaken) return response.status(409).json({ message: "El correo ya está en uso" });

  const passwordHash = await bcrypt.hash(payload.password, 10);
  await User.create({
    name: payload.name,
    email: payload.email,
    passwordHash,
    role: "gym",
    status: "active",
    gym: gym._id,
  });

  await writeAuditLog(request, { action: "gym_access.create", resource: "gym", resourceId: gym._id, metadata: { email: payload.email } });
  response.status(201).json({ gym: publicGym(await attachGymAccess(gym), { includePrivate: request.user.role === "admin" }) });
});

adminRouter.patch("/gyms/:id/access", async (request, response) => {
  const gym = await Gym.findById(request.params.id);
  if (!gym || gym.status === "archived") return response.status(404).json({ message: "Gimnasio no encontrado" });

  const user = await User.findOne({ role: "gym", gym: gym._id });
  if (!user) return response.status(404).json({ message: "Este gimnasio no tiene acceso" });

  const payload = cleanGymAccessPayload(request.body);
  if (payload.name) user.name = payload.name;
  if (payload.email && payload.email !== user.email) {
    if (!isEmail(payload.email)) return response.status(400).json({ message: "Correo inválido" });
    const exists = await User.exists({ email: payload.email, _id: { $ne: user._id } });
    if (exists) return response.status(409).json({ message: "El correo ya está en uso" });
    user.email = payload.email;
  }
  if (payload.password) {
    if (!isStrongEnoughPassword(payload.password)) return response.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres, letras y números" });
    user.passwordHash = await bcrypt.hash(payload.password, 10);
  }
  if (["active", "disabled"].includes(request.body.status)) user.status = request.body.status;

  await user.save();
  await writeAuditLog(request, { action: "gym_access.update", resource: "gym", resourceId: gym._id, metadata: { status: user.status, email: user.email } });
  response.json({ gym: publicGym(await attachGymAccess(gym), { includePrivate: request.user.role === "admin" }) });
});

adminRouter.patch("/gyms/:id/payment", async (request, response) => {
  const now = new Date();
  const nextPaymentDue = new Date(now);
  nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1);
  const gym = await Gym.findByIdAndUpdate(
    request.params.id,
    { paymentStatus: "paid", lastPaymentAt: now, nextPaymentDue },
    { new: true }
  );
  if (!gym) return response.status(404).json({ message: "Gimnasio no encontrado" });
  await writeAuditLog(request, { action: "gym_payment.mark_paid", resource: "gym", resourceId: gym._id, metadata: { amount: gym.membershipFee, nextPaymentDue: gym.nextPaymentDue } });
  response.json({ gym: publicGym(gym, { includePrivate: request.user.role === "admin" }) });
});

adminRouter.delete("/gyms/:id", async (request, response) => {
  const gym = await Gym.findByIdAndUpdate(request.params.id, { status: "archived", pickupEnabled: false }, { new: true });
  if (!gym) return response.status(404).json({ message: "Gimnasio no encontrado" });
  await writeAuditLog(request, { action: "gym.archive", resource: "gym", resourceId: gym._id, metadata: { name: gym.name } });
  response.json({ gym: publicGym(gym, { includePrivate: request.user.role === "admin" }) });
});

adminRouter.get("/categories", async (_request, response) => {
  const categories = await Category.find().sort({ name: 1 });
  response.json({ categories });
});
