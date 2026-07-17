import bcrypt from "bcryptjs";
import { connectDatabase } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { Category } from "../src/models/Category.js";
import { Supplier } from "../src/models/Supplier.js";
import { Gym } from "../src/models/Gym.js";
import { Product } from "../src/models/Product.js";
import { Order } from "../src/models/Order.js";
import { RewardDrop } from "../src/models/RewardDrop.js";
import { RewardOrder } from "../src/models/RewardOrder.js";
import { RestockGuide } from "../src/models/RestockGuide.js";
import { Coupon } from "../src/models/Coupon.js";
import { ProductReview } from "../src/models/ProductReview.js";
import { Notification } from "../src/models/Notification.js";
import { ReturnRequest } from "../src/models/ReturnRequest.js";
import { ContentPost } from "../src/models/ContentPost.js";
import { AuditLog } from "../src/models/AuditLog.js";
import { SupportTicket } from "../src/models/SupportTicket.js";
import { LegalDocument } from "../src/models/LegalDocument.js";
import { GymStock } from "../src/models/GymStock.js";
import { GymRestockRequest } from "../src/models/GymRestockRequest.js";
import { StockMovement } from "../src/models/StockMovement.js";
import { AutomationRun } from "../src/models/AutomationRun.js";
import { permissionsForPreset } from "../src/utils/adminPermissions.js";
import { ensureDefaultLegalDocuments } from "../src/utils/legalDocuments.js";

try {
  await connectDatabase();
} catch {
  process.exit(1);
}

await Promise.all([
  User.deleteMany({}),
  Category.deleteMany({}),
  Supplier.deleteMany({}),
  Gym.deleteMany({}),
  Product.deleteMany({}),
  Order.deleteMany({}),
  RewardDrop.deleteMany({}),
  RewardOrder.deleteMany({}),
  RestockGuide.deleteMany({}),
  Coupon.deleteMany({}),
  ProductReview.deleteMany({}),
  Notification.deleteMany({}),
  ReturnRequest.deleteMany({}),
  ContentPost.deleteMany({}),
  AuditLog.deleteMany({}),
  SupportTicket.deleteMany({}),
  LegalDocument.deleteMany({}),
  GymStock.deleteMany({}),
  GymRestockRequest.deleteMany({}),
  StockMovement.deleteMany({}),
  AutomationRun.deleteMany({}),
]);

const passwordHash = await bcrypt.hash("GymVerse123", 10);

const [centro, norte] = await Gym.create([
  {
    name: "GymVerse Centro",
    code: "GVC",
    address: "Av. Reforma 88",
    city: "Ciudad de México",
    phone: "5544444444",
    capacity: "high",
    membershipFee: 2500,
    paymentStatus: "paid",
    lastPaymentAt: new Date(),
  },
  {
    name: "Iron House Norte",
    code: "IHN",
    address: "Calz. Norte 102",
    city: "Ciudad de México",
    phone: "5555551212",
    capacity: "medium",
    membershipFee: 1800,
    paymentStatus: "pending",
  },
]);

const [admin, customer, gymUser] = await User.create([
  {
    name: "Admin GymVerse",
    email: "admin@gymverse.mx",
    passwordHash,
    role: "admin",
    points: 0,
  },
  {
    name: "Andrea Fitness",
    email: "cliente@gymverse.mx",
    passwordHash,
    role: "customer",
    phone: "5512345678",
    points: 860,
    affiliatedGyms: [centro._id],
    addresses: [
      {
        label: "Casa",
        street: "Av. Central 412",
        city: "Ciudad de México",
        state: "CDMX",
        zip: "06700",
        phone: "5555555555",
      },
    ],
    favorites: [],
  },
  {
    name: "Recepción GymVerse Centro",
    email: "gym@gymverse.mx",
    passwordHash,
    role: "gym",
    gym: centro._id,
    points: 0,
  },
  {
    name: "Staff Operaciones",
    email: "staff@gymverse.mx",
    passwordHash,
    role: "staff",
    adminRolePreset: "operations",
    permissions: permissionsForPreset("operations"),
    points: 0,
  },
]);

const [supplements, apparel, accessories] = await Category.create([
  { name: "Suplementos", slug: "suplementos", description: "Proteína, creatina y nutrición deportiva." },
  { name: "Ropa", slug: "ropa", description: "Prendas técnicas para entrenamiento." },
  { name: "Accesorios", slug: "accesorios", description: "Soporte, agarre y equipo de gimnasio." },
]);

const [nutrimax, ironwear, liftools] = await Supplier.create([
  { name: "NutriMax", contactName: "Laura Reyes", email: "compras@nutrimax.mx", phone: "5510101010" },
  { name: "IronWear", contactName: "Carlos Leon", email: "ventas@ironwear.mx", phone: "5520202020" },
  { name: "LiftTools", contactName: "Mariana Sol", email: "supply@liftools.mx", phone: "5530303030" },
]);

const products = await Product.create([
  {
    name: "Whey Elite 2 lb",
    slug: "whey-elite-2lb",
    category: supplements._id,
    supplier: nutrimax._id,
    description: "Proteína con 24 g por servicio para recuperación diaria.",
    tags: ["proteína", "whey", "recuperación"],
    pointsEarned: 75,
    variants: [
      { sku: "WHEY-VAN-2LB", label: "Vainilla 2 lb", price: 749, cost: 520, stock: 34, attributes: { sabor: "Vainilla" } },
      { sku: "WHEY-CHO-2LB", label: "Chocolate 2 lb", price: 749, cost: 520, stock: 21, attributes: { sabor: "Chocolate" } },
    ],
  },
  {
    name: "Creatina Core",
    slug: "creatina-core",
    category: supplements._id,
    supplier: nutrimax._id,
    description: "Creatina monohidratada micronizada para ciclos de fuerza.",
    tags: ["creatina", "fuerza"],
    pointsEarned: 45,
    variants: [
      { sku: "CREA-300", label: "300 g", price: 429, cost: 260, stock: 18, attributes: { peso: "300 g" } },
      { sku: "CREA-500", label: "500 g", price: 599, cost: 390, stock: 8, attributes: { peso: "500 g" } },
    ],
  },
  {
    name: "Playera DryFit",
    slug: "playera-dryfit",
    category: apparel._id,
    supplier: ironwear._id,
    description: "Corte atletico, secado rapido y tejido ligero.",
    tags: ["playera", "ropa", "dryfit"],
    pointsEarned: 35,
    variants: [
      { sku: "DRY-BLK-M", label: "Negra M", price: 349, cost: 180, stock: 28, attributes: { talla: "M", color: "Negro" } },
      { sku: "DRY-BLK-L", label: "Negra L", price: 349, cost: 180, stock: 24, attributes: { talla: "L", color: "Negro" } },
    ],
  },
  {
    name: "Straps Pro Grip",
    slug: "straps-pro-grip",
    category: accessories._id,
    supplier: liftools._id,
    description: "Correas acolchadas para jalones, peso muerto y sesiones pesadas.",
    tags: ["straps", "agarre", "accesorios"],
    pointsEarned: 22,
    variants: [
      { sku: "STRAP-BLK", label: "Negro", price: 219, cost: 110, stock: 9, attributes: { color: "Negro" } },
      { sku: "STRAP-YEL", label: "Amarillo", price: 229, cost: 115, stock: 12, attributes: { color: "Amarillo" } },
    ],
  },
  {
    name: "Pre Workout Nitro",
    slug: "pre-workout-nitro",
    category: supplements._id,
    supplier: nutrimax._id,
    description: "Pre entreno con cafeína, beta alanina y enfoque para sesiones intensas.",
    tags: ["pre entreno", "energía", "suplementos"],
    pointsEarned: 55,
    variants: [
      { sku: "PRE-NIT-FRUT", label: "Frutos rojos 300 g", price: 549, cost: 330, stock: 16, attributes: { sabor: "Frutos rojos" } },
      { sku: "PRE-NIT-LIM", label: "Limón 300 g", price: 549, cost: 330, stock: 14, attributes: { sabor: "Limón" } },
    ],
  },
  {
    name: "BCAA Recovery",
    slug: "bcaa-recovery",
    category: supplements._id,
    supplier: nutrimax._id,
    description: "Aminoácidos para hidratación y recuperación durante entrenamientos largos.",
    tags: ["bcaa", "recuperación", "hidratación"],
    pointsEarned: 38,
    variants: [
      { sku: "BCAA-MAN", label: "Mango 250 g", price: 389, cost: 230, stock: 19, attributes: { sabor: "Mango" } },
    ],
  },
  {
    name: "Hoodie Pump",
    slug: "hoodie-pump",
    category: apparel._id,
    supplier: ironwear._id,
    description: "Sudadera ligera para calentar, entrenar y moverte cómodo antes de la rutina.",
    tags: ["sudadera", "ropa", "pump"],
    pointsEarned: 70,
    variants: [
      { sku: "HOOD-BLK-M", label: "Negra M", price: 699, cost: 390, stock: 11, attributes: { talla: "M", color: "Negro" } },
      { sku: "HOOD-GRY-L", label: "Gris L", price: 699, cost: 390, stock: 9, attributes: { talla: "L", color: "Gris" } },
    ],
  },
  {
    name: "Short Flex",
    slug: "short-flex",
    category: apparel._id,
    supplier: ironwear._id,
    description: "Short de entrenamiento con tela elástica y cintura cómoda.",
    tags: ["short", "ropa", "pierna"],
    pointsEarned: 42,
    variants: [
      { sku: "SHORT-BLK-M", label: "Negro M", price: 429, cost: 220, stock: 17, attributes: { talla: "M", color: "Negro" } },
    ],
  },
  {
    name: "Shaker GymVerse",
    slug: "shaker-gymverse",
    category: accessories._id,
    supplier: liftools._id,
    description: "Shaker de 700 ml con rejilla mezcladora y tapa segura para llevar al gym.",
    tags: ["shaker", "accesorios", "proteína"],
    pointsEarned: 18,
    variants: [
      { sku: "SHAKER-YEL", label: "Amarillo 700 ml", price: 179, cost: 80, stock: 30, attributes: { color: "Amarillo" } },
      { sku: "SHAKER-BLK", label: "Negro 700 ml", price: 179, cost: 80, stock: 26, attributes: { color: "Negro" } },
    ],
  },
  {
    name: "Cinturón Power",
    slug: "cinturon-power",
    category: accessories._id,
    supplier: liftools._id,
    description: "Cinturón de soporte para levantamientos pesados y trabajo de fuerza.",
    tags: ["cinturón", "fuerza", "accesorios"],
    pointsEarned: 65,
    variants: [
      { sku: "BELT-M", label: "Talla M", price: 649, cost: 360, stock: 10, attributes: { talla: "M" } },
      { sku: "BELT-L", label: "Talla L", price: 649, cost: 360, stock: 7, attributes: { talla: "L" } },
    ],
  },
]);

customer.favorites = [products[0]._id, products[3]._id];
await customer.save();

await GymStock.create([
  {
    gym: centro._id,
    product: products[0]._id,
    productName: products[0].name,
    sku: "WHEY-VAN-2LB",
    variantLabel: "Vainilla 2 lb",
    quantity: 6,
  },
  {
    gym: centro._id,
    product: products[3]._id,
    productName: products[3].name,
    sku: "STRAP-BLK",
    variantLabel: "Negro",
    quantity: 4,
  },
  {
    gym: norte._id,
    product: products[1]._id,
    productName: products[1].name,
    sku: "CREA-300",
    variantLabel: "300 g",
    quantity: 5,
  },
]);

await StockMovement.create([
  {
    product: products[0]._id,
    productName: products[0].name,
    sku: "WHEY-VAN-2LB",
    variantLabel: "Vainilla 2 lb",
    supplier: nutrimax._id,
    quantity: 12,
    unitCost: 520,
    totalCost: 6240,
    note: "Carga inicial de inventario",
    createdBy: admin._id,
  },
  {
    product: products[3]._id,
    productName: products[3].name,
    sku: "STRAP-BLK",
    variantLabel: "Negro",
    supplier: liftools._id,
    quantity: 8,
    unitCost: 110,
    totalCost: 880,
    note: "Reposición para stock local",
    createdBy: admin._id,
  },
]);

const rewardDrop = await RewardDrop.create({
  title: "Drop semanal",
  subtitle: "Canjea tus puntos por accesorios de entrenamiento",
  bannerText: "Recompensas disponibles esta semana",
  status: "active",
  createdBy: admin._id,
  items: [
    { product: products[3]._id, sku: "STRAP-YEL", pointsCost: 420, stock: 4, active: true },
    { product: products[2]._id, sku: "DRY-BLK-M", pointsCost: 620, stock: 3, active: true },
  ],
});

await Coupon.create([
  {
    code: "GYM10",
    title: "10% en tu siguiente compra",
    description: "10% de descuento en compras desde $500",
    type: "percentage",
    value: 10,
    minSubtotal: 500,
    maxDiscount: 180,
  },
  {
    code: "ENVIOFIT",
    title: "Envío gratis",
    description: "Envío gratis a domicilio",
    type: "free_shipping",
    minSubtotal: 300,
  },
]);

const pickupOrder = await Order.create({
  orderNumber: "GV-20260621-1001",
  customer: customer._id,
  items: [
    {
      product: products[0]._id,
      productName: products[0].name,
      sku: "WHEY-VAN-2LB",
      variantLabel: "Vainilla 2 lb",
      price: 749,
      quantity: 1,
    },
  ],
  subtotal: 749,
  shippingFee: 0,
  total: 749,
  pointsEarned: 75,
  deliveryMethod: "pickup",
  pickupGym: centro._id,
  pickupCode: "482913",
  status: "ready_for_pickup",
  paymentStatus: "paid",
  paidAt: new Date(),
});

const homeOrder = await Order.create({
  orderNumber: "GV-20260621-1002",
  customer: customer._id,
  items: [
    {
      product: products[3]._id,
      productName: products[3].name,
      sku: "STRAP-BLK",
      variantLabel: "Negro",
      price: 219,
      quantity: 1,
    },
  ],
  subtotal: 219,
  shippingFee: 79,
  discount: 0,
  total: 298,
  pointsEarned: 22,
  deliveryMethod: "home",
  shippingAddress: customer.addresses[0],
  status: "in_transit",
  paymentStatus: "pending",
  paymentMethod: "mercado_pago",
  paymentProvider: "mercado_pago",
  paymentExpiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
});

const returnedOrder = await Order.create({
  orderNumber: "GV-20260622-1003",
  customer: customer._id,
  items: [
    {
      product: products[2]._id,
      productName: products[2].name,
      sku: "DRY-BLK-M",
      variantLabel: "Negra M",
      price: 349,
      cost: 180,
      quantity: 1,
    },
  ],
  subtotal: 349,
  shippingFee: 79,
  discount: 35,
  discountCode: "GYM10",
  total: 393,
  pointsEarned: 35,
  deliveryMethod: "home",
  shippingAddress: customer.addresses[0],
  status: "returned",
  paymentStatus: "refunded",
  paymentMethod: "mercado_pago",
  paymentProvider: "mercado_pago",
  paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
});

await Order.create({
  orderNumber: "GV-20260623-1004",
  customer: customer._id,
  items: [
    {
      product: products[1]._id,
      productName: products[1].name,
      sku: "CREA-300",
      variantLabel: "300 g",
      price: 429,
      cost: 260,
      quantity: 1,
    },
  ],
  subtotal: 429,
  shippingFee: 0,
  total: 429,
  pointsEarned: 0,
  deliveryMethod: "pickup",
  pickupGym: norte._id,
  pickupCode: "918274",
  status: "cancelled",
  paymentStatus: "pending",
  paymentMethod: "pickup",
  paymentProvider: "pickup",
  adminArchivedAt: new Date(),
});

await RewardOrder.create({
  rewardNumber: "RW-20260624-1001",
  customer: customer._id,
  drop: rewardDrop._id,
  items: [
    {
      product: products[3]._id,
      productName: products[3].name,
      sku: "STRAP-YEL",
      variantLabel: "Amarillo",
      pointsCost: 420,
      quantity: 1,
    },
  ],
  totalPoints: 420,
  deliveryMethod: "pickup",
  pickupGym: centro._id,
  status: "preparing",
});

await ReturnRequest.create({
  returnNumber: "RET-20260625-1001",
  order: returnedOrder._id,
  customer: customer._id,
  reason: "La talla solicitada no quedó correctamente y el empaque se conserva en buen estado.",
  resolutionNote: "Reembolso procesado por política de cambio de talla.",
  status: "refunded",
  resolvedAt: new Date(),
});

await RestockGuide.create({
  guideNumber: "RG-20260625-1001",
  createdBy: admin._id,
  items: [
    {
      product: products[1]._id,
      productName: products[1].name,
      sku: "CREA-500",
      variantLabel: "500 g",
      supplier: nutrimax._id,
      supplierName: nutrimax.name,
      email: nutrimax.email,
      quantity: 10,
      unitCost: 390,
      totalCost: 3900,
    },
    {
      product: products[2]._id,
      productName: products[2].name,
      sku: "DRY-BLK-L",
      variantLabel: "Negra L",
      supplier: ironwear._id,
      supplierName: ironwear.name,
      email: ironwear.email,
      quantity: 8,
      unitCost: 180,
      totalCost: 1440,
    },
  ],
  totalItems: 18,
  totalCost: 5340,
});

await GymRestockRequest.create([
  {
    requestNumber: "GR-20260626-1001",
    gym: centro._id,
    requestedBy: gymUser._id,
    note: "Reponer producto más solicitado para retiros del fin de semana.",
    items: [
      {
        product: products[0]._id,
        productName: products[0].name,
        sku: "WHEY-VAN-2LB",
        variantLabel: "Vainilla 2 lb",
        quantity: 3,
        currentStock: 6,
      },
    ],
    status: "requested",
  },
  {
    requestNumber: "GR-20260620-1002",
    gym: centro._id,
    requestedBy: gymUser._id,
    confirmedBy: admin._id,
    confirmedAt: new Date(),
    adminNote: "Traslado confirmado en ruta interna.",
    items: [
      {
        product: products[3]._id,
        productName: products[3].name,
        sku: "STRAP-BLK",
        variantLabel: "Negro",
        quantity: 2,
        currentStock: 2,
      },
    ],
    status: "transferred",
  },
]);

await Notification.create([
  {
    role: "admin",
    noticeCode: "NTF-ADMIN-001",
    title: "Solicitud de stock local",
    message: "GymVerse Centro envió una guía de reabastecimiento para revisar.",
    type: "warning",
    linkType: "restock",
  },
  {
    recipient: customer._id,
    role: "customer",
    noticeCode: "NTF-APP-001",
    title: "Pedido en camino",
    message: "Tu pedido GV-20260621-1002 está en tránsito.",
    type: "info",
    linkType: "order",
    linkId: homeOrder._id,
  },
  {
    recipient: gymUser._id,
    role: "gym",
    noticeCode: "NTF-GYM-001",
    title: "Traslado confirmado",
    message: "Administración confirmó una solicitud de reabastecimiento.",
    type: "success",
    linkType: "restock",
  },
]);

await SupportTicket.create([
  {
    ticketNumber: "SUP-20260624-1001",
    customer: customer._id,
    subject: "Duda sobre pago pendiente",
    category: "payment",
    status: "waiting_team",
    priority: "normal",
    order: homeOrder._id,
    messages: [
      {
        author: customer._id,
        authorRole: "customer",
        message: "Quiero confirmar si puedo pagar este pedido desde mi historial antes de que expire.",
      },
    ],
  },
  {
    ticketNumber: "SUP-20260625-1002",
    customer: customer._id,
    assignedTo: admin._id,
    subject: "Cambio de talla resuelto",
    category: "return",
    status: "resolved",
    priority: "low",
    order: returnedOrder._id,
    resolvedAt: new Date(),
    messages: [
      {
        author: customer._id,
        authorRole: "customer",
        message: "Solicité devolución por talla y ya recibí respuesta.",
      },
      {
        author: admin._id,
        authorRole: "admin",
        message: "El reembolso quedó procesado y el caso fue cerrado.",
      },
    ],
  },
]);

await AuditLog.create([
  {
    actor: admin._id,
    actorRole: "admin",
    action: "seed.created",
    resource: "database",
    resourceId: "demo",
    ip: "127.0.0.1",
    userAgent: "GymVerse Seed",
    metadata: { collections: "demo-light" },
  },
  {
    actor: gymUser._id,
    actorRole: "gym",
    action: "gym.restock.requested",
    resource: "gymRestockRequest",
    resourceId: "GR-20260626-1001",
    ip: "127.0.0.1",
    userAgent: "GymVerse Seed",
    metadata: { gym: centro.code },
  },
]);

await AutomationRun.create({
  rule: "low-stock",
  status: "completed",
  summary: "Se detectaron variantes con stock bajo y pagos pendientes.",
  triggeredCount: 2,
  changedCount: 1,
  details: [
    { label: "Stock bajo", message: "Creatina Core 500 g tiene 8 piezas." },
    { label: "Pago pendiente", message: "Iron House Norte tiene afiliación pendiente." },
  ],
  createdBy: admin._id,
});

await ProductReview.create([
  {
    product: products[0]._id,
    customer: customer._id,
    rating: 5,
    comment: "Muy buen sabor y se disuelve rápido después de entrenar.",
    verifiedPurchase: true,
  },
  {
    product: products[3]._id,
    customer: customer._id,
    rating: 4,
    comment: "Buen agarre para peso muerto, se sienten resistentes.",
    verifiedPurchase: false,
  },
]);

await ContentPost.create([
  {
    title: "Rutina de fuerza de 3 días para volver al ritmo",
    slug: "rutina-fuerza-3-dias",
    summary: "Una estructura simple para trabajar básicos, progresar cargas y no quemarte en la primera semana.",
    body:
      "Día 1: sentadilla, press de banca, remo y trabajo corto de abdomen. Mantén dos repeticiones en reserva y registra tus cargas.\nDía 2: peso muerto, press militar, jalón y accesorios de espalda. La prioridad es técnica limpia antes que ego.\nDía 3: pierna unilateral, empuje inclinado, jalón horizontal y brazos. Sube peso solo cuando completes todas las series con buena forma.",
    type: "training",
    level: "beginner",
    readMinutes: 5,
    tags: ["fuerza", "principiante", "rutina"],
    featured: true,
    status: "published",
    publishedAt: new Date(),
    relatedProducts: [products[3]._id, products[2]._id],
    createdBy: admin._id,
  },
  {
    title: "Proteína y creatina: cuándo usarlas sin complicarte",
    slug: "proteina-creatina-cuando-usarlas",
    summary: "Guía práctica para entender qué aporta cada suplemento y cómo integrarlo a una alimentación constante.",
    body:
      "La proteína ayuda a cubrir tu meta diaria cuando no llegas con comida. Úsala como herramienta, no como reemplazo de todas tus comidas.\nLa creatina funciona por saturación: lo importante es tomarla diario, no la hora exacta. Tres a cinco gramos al día son suficientes para la mayoría.\nSi entrenas fuerte, prioriza sueño, hidratación y consistencia. Los suplementos suman cuando la base ya está puesta.",
    type: "nutrition",
    level: "beginner",
    readMinutes: 4,
    tags: ["proteína", "creatina", "suplementos"],
    featured: true,
    status: "published",
    publishedAt: new Date(),
    relatedProducts: [products[0]._id, products[1]._id],
    createdBy: admin._id,
  },
  {
    title: "Recuperación: señales de que necesitas bajar intensidad",
    slug: "recuperacion-senales-bajar-intensidad",
    summary: "Dolor persistente, sueño ligero y rendimiento estancado pueden indicar que necesitas ajustar volumen.",
    body:
      "No todo cansancio es progreso. Si tu rendimiento cae por varios entrenamientos seguidos, revisa sueño, estrés y alimentación.\nUna semana de descarga no es perder avance: puede ayudarte a volver más fuerte. Reduce volumen, conserva técnica y camina más.\nUsa accesorios, movilidad y calentamientos inteligentes para cuidar articulaciones cuando subes cargas.",
    type: "recovery",
    level: "intermediate",
    readMinutes: 3,
    tags: ["recuperación", "descarga", "movilidad"],
    status: "published",
    publishedAt: new Date(),
    relatedProducts: [products[3]._id],
    createdBy: admin._id,
  },
]);

await ensureDefaultLegalDocuments();

console.log("Seed listo");
console.log("Admin: admin@gymverse.mx / GymVerse123");
console.log("Cliente: cliente@gymverse.mx / GymVerse123");
console.log("Gimnasio: gym@gymverse.mx / GymVerse123");
console.log(`Gimnasios: ${centro.name}, ${norte.name}`);
console.log(`Productos demo: ${products.length}`);

process.exit(0);
