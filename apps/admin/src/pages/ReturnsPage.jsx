import React, { useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { money } from "../services/api.js";

const statusLabels = {
  requested: "En revisión",
  approved: "Aprobada",
  rejected: "Rechazada",
  received: "Recibida",
  refunded: "Reembolsada",
};

const statusOptions = ["requested", "approved", "rejected", "received", "refunded"];

export function ReturnsPage({ returnRequests, onUpdateReturn }) {
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState({});

  const filtered = returnRequests.filter((item) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return [item.returnNumber, item.order?.orderNumber, item.customer?.name, item.customer?.email, item.reason]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized));
  });
  const returnsPager = usePagedItems(filtered);

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Post-compra</span>
          <h1>Devoluciones</h1>
        </div>
      </div>

      <label className="searchField">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar devolución, pedido o cliente" />
      </label>

      <div className="returnList">
        {filtered.length === 0 && <div className="emptyState">No hay devoluciones para mostrar.</div>}
        {returnsPager.pagedItems.map((item) => (
          <article className="returnCard" key={item._id}>
            <div className="returnTop">
              <div>
                <span className="pill">{statusLabels[item.status] || item.status}</span>
                <h2>{item.returnNumber}</h2>
                <p>{item.customer?.name} · {item.order?.orderNumber}</p>
              </div>
              <strong>{money(item.order?.total || 0)}</strong>
            </div>

            <div className="returnReason">
              <span>Motivo</span>
              <p>{item.reason}</p>
            </div>

            <div className="returnControls">
              <select value={item.status} onChange={(event) => onUpdateReturn(item._id, event.target.value, notes[item._id] || item.resolutionNote || "")}>
                {statusOptions.map((status) => (
                  <option value={status} key={status}>{statusLabels[status]}</option>
                ))}
              </select>
              <input
                value={notes[item._id] ?? item.resolutionNote ?? ""}
                onChange={(event) => setNotes({ ...notes, [item._id]: event.target.value })}
                placeholder="Nota para el cliente"
              />
              <button className="ghostButton" onClick={() => onUpdateReturn(item._id, item.status, notes[item._id] || item.resolutionNote || "")}>
                <CheckCircle2 size={16} />
                Guardar nota
              </button>
            </div>
          </article>
        ))}
      </div>
      <PaginationControls {...returnsPager} />
    </section>
  );
}
