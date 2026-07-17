export const ROLE_PRESETS = [
  {
    key: "operations",
    label: "Operación diaria",
    description: "Pedidos, pagos, avisos y devoluciones del día a día.",
    permissions: ["overview", "orders", "returns", "notifications", "support"],
  },
  {
    key: "inventory",
    label: "Inventario y compras",
    description: "Catálogo, stock, proveedores y reabastecimiento.",
    permissions: ["overview", "inventory", "restock", "suppliers", "notifications"],
  },
  {
    key: "affiliates",
    label: "Afiliados",
    description: "Gimnasios afiliados, pagos mensuales y operación de retiro.",
    permissions: ["overview", "gyms", "orders", "returns", "notifications", "support"],
  },
  {
    key: "marketing",
    label: "Marketing y contenido",
    description: "Promociones, recompensas y contenido fitness.",
    permissions: ["overview", "coupons", "rewards", "content", "notifications", "legal"],
  },
  {
    key: "finance",
    label: "Finanzas y reportes",
    description: "Resumen comercial, reportes, pagos y afiliaciones.",
    permissions: ["overview", "orders", "gyms", "reports", "finance", "notifications"],
  },
  {
    key: "supervisor",
    label: "Supervisor",
    description: "Acceso operativo completo sin administración de usuarios.",
    permissions: [
      "overview",
      "orders",
      "returns",
      "notifications",
      "inventory",
      "restock",
      "gyms",
      "suppliers",
      "coupons",
      "rewards",
      "content",
      "automations",
      "legal",
      "audit",
      "finance",
      "reports",
    ],
  },
];

export const PERMISSION_LABELS = {
  overview: "Resumen",
  orders: "Pedidos",
  returns: "Devoluciones",
  notifications: "Avisos",
  support: "Soporte",
  inventory: "Inventario",
  restock: "Reabastecer",
  gyms: "Gimnasios",
  suppliers: "Proveedores",
  coupons: "Promos",
  rewards: "Recompensas",
  content: "Contenido",
  automations: "Automatizaciones",
  legal: "Legal",
  audit: "Auditoría",
  finance: "Finanzas",
  reports: "Reportes",
};

export function canAccess(user, view) {
  if (user?.role === "admin") return true;
  if (user?.role !== "staff") return false;
  return (user.permissions || []).includes(view);
}

export function presetByKey(key) {
  return ROLE_PRESETS.find((preset) => preset.key === key) || ROLE_PRESETS[0];
}
