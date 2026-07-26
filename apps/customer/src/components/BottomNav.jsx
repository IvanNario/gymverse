import React, { useEffect, useMemo, useState } from "react";
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
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const activeItem = useMemo(() => items.find((item) => item.id === active) || items[0], [active]);
  const ActiveIcon = activeItem.icon;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const updateMode = () => {
      setIsMobile(media.matches);
      if (!media.matches) setIsCollapsed(false);
    };
    updateMode();
    media.addEventListener("change", updateMode);
    return () => media.removeEventListener("change", updateMode);
  }, []);

  useEffect(() => {
    if (!isMobile) return undefined;
    let lastY = window.scrollY;
    let ticking = false;
    function updateNav() {
      const currentY = Math.max(0, window.scrollY);
      const scrollingDown = currentY > lastY + 8;
      const scrollingUp = currentY < lastY - 12;
      if (currentY < 80 || scrollingUp) setIsCollapsed(false);
      if (currentY > 120 && scrollingDown) setIsCollapsed(true);
      lastY = currentY;
      ticking = false;
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateNav);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  function goToView(id) {
    setIsCollapsed(false);
    onChange(id);
  }

  return (
    <>
      <nav className={`bottomNav ${isCollapsed ? "isCollapsed" : ""}`} aria-label="Navegación">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => goToView(item.id)}>
              <Icon size={18} />
              {item.id === "notifications" && unread > 0 && <strong className="navBadge">{unread}</strong>}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <button
        className={`mobileNavFab ${isCollapsed ? "isVisible" : ""}`}
        type="button"
        aria-label={`Abrir menú: ${activeItem.label}`}
        onClick={() => setIsCollapsed(false)}
      >
        <ActiveIcon size={21} />
        {unread > 0 && <strong className="navBadge">{unread}</strong>}
      </button>
    </>
  );
}
