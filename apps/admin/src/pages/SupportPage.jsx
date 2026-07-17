import React, { useEffect, useMemo, useState } from "react";
import { MessageSquareReply, Search, Send } from "lucide-react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";

const statusLabels = {
  open: "Abierto",
  waiting_customer: "Espera cliente",
  waiting_team: "Espera equipo",
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

export function SupportPage({ tickets = [], onUpdate }) {
  const [selectedId, setSelectedId] = useState(tickets[0]?._id || "");
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");
  const selected = tickets.find((ticket) => ticket._id === selectedId) || tickets[0];
  useEffect(() => {
    if (!selectedId && tickets[0]?._id) setSelectedId(tickets[0]._id);
  }, [selectedId, tickets]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tickets;
    return tickets.filter((ticket) =>
      [ticket.ticketNumber, ticket.subject, ticket.customer?.name, ticket.customer?.email, ticket.status, ticket.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [tickets, query]);
  const ticketsPager = usePagedItems(filtered);

  async function submit(event) {
    event.preventDefault();
    if (!selected) return;
    await onUpdate(selected._id, { reply, status: selected.status === "resolved" ? "resolved" : "waiting_customer", priority: selected.priority });
    setReply("");
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Atención</span>
          <h1>Soporte al cliente</h1>
        </div>
      </div>

      <div className="supportLayout">
        <aside className="panel supportQueue">
          <label className="searchField inline">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ticket" />
          </label>
          {filtered.length === 0 && <div className="emptyState">Sin tickets.</div>}
          {ticketsPager.pagedItems.map((ticket) => (
            <button className={`supportTicketButton ${selected?._id === ticket._id ? "active" : ""}`} key={ticket._id} onClick={() => setSelectedId(ticket._id)}>
              <strong>{ticket.ticketNumber}</strong>
              <span>{ticket.subject}</span>
              <small>{statusLabels[ticket.status]} · {categoryLabels[ticket.category]}</small>
            </button>
          ))}
          <PaginationControls {...ticketsPager} />
        </aside>

        <section className="panel supportConversation">
          {!selected ? (
            <div className="emptyState">Selecciona un ticket para responder.</div>
          ) : (
            <>
              <div className="editorTitle">
                <div>
                  <span>{selected.customer?.name || "Cliente"} · {categoryLabels[selected.category]}</span>
                  <h2>{selected.subject}</h2>
                </div>
                <select value={selected.status} onChange={(event) => onUpdate(selected._id, { status: event.target.value, priority: selected.priority })}>
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              <div className="supportMessages">
                {(selected.messages || []).map((message) => (
                  <article className={`supportMessage ${message.authorRole === "customer" ? "" : "team"}`} key={message._id || message.createdAt}>
                    <strong>{message.authorRole === "customer" ? "Cliente" : "Equipo GymVerse"}</strong>
                    <p>{message.message}</p>
                    <span>{formatDate(message.createdAt || selected.createdAt)}</span>
                  </article>
                ))}
              </div>

              <form className="supportReply" onSubmit={submit}>
                <MessageSquareReply size={18} />
                <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Responder al cliente" required />
                <button className="primaryButton compact">
                  <Send size={16} />
                  Enviar
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
