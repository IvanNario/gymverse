import React, { useMemo, useState } from "react";
import { Activity, Search, ShieldCheck } from "lucide-react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";

function formatDate(value) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditPage({ logs = [] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return logs;
    return logs.filter((log) =>
      [log.action, log.resource, log.actor?.name, log.actor?.email, log.actorRole, JSON.stringify(log.metadata || {})]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [logs, query]);
  const logsPager = usePagedItems(filtered);

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Seguridad</span>
          <h1>Panel de auditoría</h1>
        </div>
      </div>

      <div className="metricGrid overviewMetrics">
        <article className="metricCard"><ShieldCheck size={18} /><span>Eventos</span><strong>{logs.length}</strong></article>
        <article className="metricCard"><Activity size={18} /><span>Último evento</span><strong>{logs[0] ? formatDate(logs[0].createdAt) : "Sin datos"}</strong></article>
      </div>

      <label className="searchField">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar acción, usuario o recurso" />
      </label>

      <section className="panel dataPanel">
        <div className="dataTable">
          <div className="dataTableHead audit">
            <span>Fecha</span>
            <span>Actor</span>
            <span>Acción</span>
            <span>Recurso</span>
            <span>Detalle</span>
          </div>
          {filtered.length === 0 && <div className="emptyState">No hay eventos para mostrar.</div>}
          {logsPager.pagedItems.map((log) => (
            <div className="dataTableRow audit" key={log._id}>
              <span>{formatDate(log.createdAt)}</span>
              <span>{log.actor?.name || log.actorRole || "Sistema"}</span>
              <strong>{log.action}</strong>
              <span>{log.resource || "-"}</span>
              <small>{Object.keys(log.metadata || {}).length ? JSON.stringify(log.metadata) : "Sin detalle"}</small>
            </div>
          ))}
        </div>
        <PaginationControls {...logsPager} />
      </section>
    </section>
  );
}
