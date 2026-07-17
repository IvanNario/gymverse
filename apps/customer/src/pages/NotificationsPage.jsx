import React, { useState } from "react";
import { Bell, CheckCheck, Smartphone, Trash2 } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";

function formatDate(value) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsPage({ notifications, unread, onReadAll, onClear, onEnablePush }) {
  const [confirm, setConfirm] = useState(null);
  const notificationsPager = usePagedItems(notifications);

  function confirmClear() {
    setConfirm({
      title: "Limpiar avisos",
      message: "Se ocultarán tus notificaciones actuales de la app. Los pedidos y tickets no se modificarán.",
      confirmLabel: "Limpiar",
      onConfirm: async () => {
        await onClear();
        setConfirm(null);
      },
    });
  }

  return (
    <section className="screen notificationsScreen">
      <div className="sectionTop">
        <div>
          <span>{unread} sin leer</span>
          <h1>Avisos</h1>
        </div>
        <div className="notificationActions">
          <button className="ghostRound" onClick={onReadAll} aria-label="Marcar avisos como leídos" title="Marcar como leídos" disabled={!unread}>
            <CheckCheck size={18} />
          </button>
          <button className="ghostRound dangerRound" onClick={confirmClear} aria-label="Limpiar avisos" title="Limpiar avisos" disabled={!notifications.length}>
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <button className="notificationPermission" onClick={onEnablePush} type="button">
        <Smartphone size={17} />
        Activar avisos del navegador
      </button>
      <div className="notificationList">
        {notifications.length === 0 && <div className="emptyCard">No tienes avisos todavía.</div>}
        {notificationsPager.pagedItems.map((notification) => (
          <article className={`notificationCard ${notification.readAt ? "" : "unread"}`} key={notification._id}>
            <Bell size={18} />
            <div>
              <div className="notificationTitleLine">
                <span className="noticeCode">{notification.noticeCode}</span>
                <strong>{notification.title}</strong>
              </div>
              <p>{notification.message}</p>
              <span>{formatDate(notification.createdAt)}</span>
            </div>
          </article>
        ))}
      </div>
      <PaginationControls {...notificationsPager} />
      <ConfirmDialog open={Boolean(confirm)} {...(confirm || {})} onCancel={() => setConfirm(null)} />
    </section>
  );
}
