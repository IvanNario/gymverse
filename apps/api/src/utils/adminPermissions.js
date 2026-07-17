export const ADMIN_PERMISSION_KEYS = [
  "overview",
  "orders",
  "returns",
  "notifications",
  "support",
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
];

export const ADMIN_ROLE_PRESETS = [
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
    permissions: ADMIN_PERMISSION_KEYS,
  },
];

export function normalizeAdminPermissions(permissions = []) {
  const allowed = new Set(ADMIN_PERMISSION_KEYS);
  return [...new Set((permissions || []).filter((permission) => allowed.has(permission)))];
}

export function permissionsForPreset(presetKey) {
  const preset = ADMIN_ROLE_PRESETS.find((preset) => preset.key === presetKey) || ADMIN_ROLE_PRESETS[0];
  return normalizeAdminPermissions(preset.permissions);
}

export function hasAdminPermission(user, permission) {
  if (user?.role === "admin") return true;
  if (user?.role !== "staff") return false;
  return normalizeAdminPermissions(user.permissions).includes(permission);
}
