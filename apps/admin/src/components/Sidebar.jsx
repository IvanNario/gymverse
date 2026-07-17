import React from "react";
import { Archive, BarChart3, Bell, BookOpen, Boxes, Bot, Dumbbell, FileSpreadsheet, Gift, Landmark, LifeBuoy, LogOut, PackageCheck, Percent, Repeat2, RotateCcw, Scale, ShieldCheck, Truck, UsersRound } from "lucide-react";

const nav = [
  {
    section: "Prioridad",
    items: [
      { id: "overview", label: "Resumen", icon: BarChart3 },
      { id: "orders", label: "Pedidos", icon: PackageCheck },
      { id: "notifications", label: "Avisos", icon: Bell },
      { id: "support", label: "Soporte", icon: LifeBuoy },
      { id: "returns", label: "Devoluciones", icon: RotateCcw },
    ],
  },
  {
    section: "Operación",
    items: [
      { id: "inventory", label: "Inventario", icon: Boxes },
      { id: "restock", label: "Reabastecer", icon: Repeat2 },
      { id: "gyms", label: "Gimnasios", icon: Dumbbell },
      { id: "suppliers", label: "Proveedores", icon: Truck },
    ],
  },
  {
    section: "Crecimiento",
    items: [
      { id: "coupons", label: "Promos", icon: Percent },
      { id: "rewards", label: "Recompensas", icon: Gift },
      { id: "content", label: "Contenido", icon: BookOpen },
      { id: "automations", label: "Automatizaciones", icon: Bot },
    ],
  },
  {
    section: "Control",
    items: [
      { id: "finance", label: "Finanzas", icon: Landmark },
      { id: "audit", label: "Auditoría", icon: ShieldCheck },
      { id: "legal", label: "Legal", icon: Scale },
    ],
  },
  {
    section: "Configuración",
    items: [{ id: "users", label: "Usuarios", icon: UsersRound, adminOnly: true }],
  },
  {
    section: "Consulta",
    items: [
      { id: "archivedOrders", label: "Archivados", icon: Archive, permission: "orders" },
      { id: "reports", label: "Reportes PDF", icon: FileSpreadsheet },
    ],
  },
];

export function Sidebar({ active, onChange, onLogout, unread = 0, allowedViews = [], canManageUsers = false }) {
  const allowed = new Set(allowedViews);

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo-white-bg.png" alt="GymVerse" />
        <div>
          <strong>GymVerse</strong>
          <span>Admin</span>
        </div>
      </div>
      <nav>
        {nav.map((group) => {
          const items = group.items.filter((item) => (item.adminOnly ? canManageUsers : allowed.has(item.permission || item.id)));
          if (!items.length) return null;
          return (
            <React.Fragment key={group.section}>
              <span className="sidebarSection">{group.section}</span>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => onChange(item.id)}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.id === "notifications" && unread > 0 && <strong className="sidebarBadge">{unread}</strong>}
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </nav>
      <button className="logoutButton" onClick={onLogout}>
        <LogOut size={18} />
        Salir
      </button>
    </aside>
  );
}
