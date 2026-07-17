import React, { useEffect, useState } from "react";
import { ArrowLeft, LifeBuoy, Send } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { validateSupportTicket } from "../utils/forms.js";

const emptyForm = {
  subject: "",
  category: "order",
  message: "",
};

const statusLabels = {
  open: "Abierto",
  waiting_customer: "Esperando tu respuesta",
  waiting_team: "En revisión",
  resolved: "Resuelto",
};

const categoryLabels = {
  order: "Pedido",
  payment: "Pago",
  return: "Devolución",
  account: "Cuenta",
  gym: "Gimnasio",
  other: "Otro",
};

function formatDate(value) {
  return new Date(value).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function SupportPage({ tickets = [], onCreate, onReply, onClose, onBack }) {
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(tickets[0]?._id || "");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const selected = tickets.find((ticket) => ticket._id === selectedId) || tickets[0];
  const ticketsPager = usePagedItems(tickets);

  useEffect(() => {
    if (!selectedId && tickets[0]?._id) setSelectedId(tickets[0]._id);
  }, [selectedId, tickets]);

  async function submitTicket(event) {
    event.preventDefault();
    setError("");
    const validation = validateSupportTicket(form);
    if (validation) {
      setError(validation);
      return;
    }
    const ticket = await onCreate(form);
    setForm(emptyForm);
    if (ticket?._id) setSelectedId(ticket._id);
  }

  async function submitReply(event) {
    event.preventDefault();
    if (reply.trim().length < 2) {
      setError("Escribe una respuesta antes de enviar");
      return;
    }
    setError("");
    await onReply(selected._id, reply);
    setReply("");
  }

  function confirmCloseTicket(ticket) {
    setConfirm({
      title: "Cerrar ticket",
      message: `El ticket ${ticket.ticketNumber} quedará marcado como resuelto. Podrás crear otro si necesitas más ayuda.`,
      confirmLabel: "Cerrar ticket",
      onConfirm: async () => {
        await onClose(ticket._id);
        setConfirm(null);
      },
    });
  }

  return (
    <section className="screen supportScreen">
      <div className="detailTop">
        <button className="iconTextButton" onClick={onBack}>
          <ArrowLeft size={18} />
          Volver
        </button>
      </div>

      <header className="supportHero">
        <LifeBuoy size={26} />
        <div>
          <span>Soporte GymVerse</span>
          <h1>Estamos contigo</h1>
          <p>Abre un ticket y da seguimiento a respuestas del equipo.</p>
        </div>
      </header>

      <form className="supportForm" onSubmit={submitTicket}>
        <h2>Nuevo ticket</h2>
        <label>
          <span>Asunto</span>
          <input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} minLength={5} required />
        </label>
        <label>
          <span>Categoría</span>
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Mensaje</span>
          <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} minLength={15} required />
        </label>
        {error && <p className="errorText">{error}</p>}
        <button className="primaryButton">
          <Send size={18} />
          Enviar ticket
        </button>
      </form>

      <section className="supportTickets">
        <h2>Mis tickets</h2>
        {tickets.length === 0 && <div className="emptyCard">Aún no tienes tickets de soporte.</div>}
        {ticketsPager.pagedItems.map((ticket) => (
          <button className={`supportTicketMini ${selected?._id === ticket._id ? "active" : ""}`} key={ticket._id} onClick={() => setSelectedId(ticket._id)}>
            <strong>{ticket.ticketNumber}</strong>
            <span>{ticket.subject}</span>
            <small>{statusLabels[ticket.status]} · {categoryLabels[ticket.category]}</small>
          </button>
        ))}
        <PaginationControls {...ticketsPager} />
      </section>

      {selected && (
        <section className="supportThread">
          <div className="supportThreadHead">
            <div>
              <span>{selected.ticketNumber}</span>
              <h2>{selected.subject}</h2>
            </div>
            {selected.status !== "resolved" && (
              <button
                className="ghostRound text"
                onClick={() => confirmCloseTicket(selected)}
                type="button"
              >
                Cerrar
              </button>
            )}
          </div>
          {(selected.messages || []).map((message) => (
            <article className={`supportBubble ${message.authorRole === "customer" ? "mine" : ""}`} key={message._id || message.createdAt}>
              <p>{message.message}</p>
              <span>{message.authorRole === "customer" ? "Tú" : "GymVerse"} · {formatDate(message.createdAt || selected.createdAt)}</span>
            </article>
          ))}
          {selected.status !== "resolved" && (
            <form className="supportReplyCustomer" onSubmit={submitReply}>
              <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Responder" required />
              {error && <p className="errorText">{error}</p>}
              <button className="primaryButton">
                <Send size={18} />
                Enviar
              </button>
            </form>
          )}
        </section>
      )}
      <ConfirmDialog open={Boolean(confirm)} {...(confirm || {})} onCancel={() => setConfirm(null)} />
    </section>
  );
}
