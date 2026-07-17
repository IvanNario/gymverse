import React from "react";
import { Bell, BookOpen, Dumbbell, ReceiptText, ShoppingBag, UserRound } from "lucide-react";

const items = [
  { id: "shop", label: "Tienda", icon: ShoppingBag },
  { id: "content", label: "Guías", icon: BookOpen },
  { id: "cart", label: "Carrito", icon: Dumbbell },
  { id: "orders", label: "Pedidos", icon: ReceiptText },
  { id: "notifications", label: "Avisos", icon: Bell },
  { id: "profile", label: "Perfil", icon: UserRound },
];

export function BottomNav({ active, onChange, unread = 0 }) {
  return (
    <nav className="bottomNav" aria-label="Navegación">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => onChange(item.id)}>
            <Icon size={18} />
            {item.id === "notifications" && unread > 0 && <strong className="navBadge">{unread}</strong>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
