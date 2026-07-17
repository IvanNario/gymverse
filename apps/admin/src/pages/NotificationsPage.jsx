import React, { useState } from "react";
import { Bell, CheckCheck, Send } from "lucide-react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";

function formatDate(value) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsPage({ notifications, unread, onReadAll, onSend }) {
  const [form, setForm] = useState({ title: "", message: "", audience: "customer" });
  const notificationsPager = usePagedItems(notifications);

  async function submit(event) {
    event.preventDefault();
    await onSend(form);
    setForm({ title: "", message: "", audience: "customer" });
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>{unread} sin leer</span>
          <h1>Avisos</h1>
        </div>
        <button className="primaryButton compact" onClick={onReadAll} disabled={!unread}>
          <CheckCheck size={17} />
          Marcar leídos
        </button>
      </div>

      <form className="editorPanel notificationComposer" onSubmit={submit}>
        <div className="editorTitle">
          <div>
            <span>Notificación real</span>
            <h2>Enviar aviso</h2>
          </div>
          <button className="primaryButton compact">
            <Send size={16} />
            Enviar
          </button>
        </div>
        <div className="formGrid">
          <label>
            <span>Audiencia</span>
            <select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}>
              <option value="customer">Clientes</option>
              <option value="gym">Gimnasios</option>
              <option value="admin">Administradores y staff</option>
            </select>
          </label>
          <label>
            <span>Título</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>
        </div>
        <label>
          <span>Mensaje</span>
          <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required />
        </label>
      </form>

      <div className="notificationList admin">
        {notifications.length === 0 && <div className="emptyState">No hay avisos todavía.</div>}
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
    </section>
  );
}
