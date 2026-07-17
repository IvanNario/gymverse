import React, { useState } from "react";
import { AlertTriangle, BellRing, Clock, Play, RefreshCw, ShieldCheck, TicketPercent } from "lucide-react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";

const metricCards = [
  { key: "expiredCoupons", label: "Promos vencidas", icon: TicketPercent },
  { key: "lowStockItems", label: "Stock bajo", icon: AlertTriangle },
  { key: "pendingPayments", label: "Pagos pendientes", icon: Clock },
  { key: "overdueGyms", label: "Afiliaciones vencidas", icon: BellRing },
];

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AutomationsPage({ automations, onRun }) {
  const [runningRule, setRunningRule] = useState("");
  const metrics = automations?.metrics || {};
  const rules = automations?.rules || [];
  const runs = automations?.runs || [];
  const preview = automations?.lowStockPreview || [];
  const rulesPager = usePagedItems(rules);
  const previewPager = usePagedItems(preview);
  const runsPager = usePagedItems(runs);

  async function run(rule) {
    setRunningRule(rule);
    try {
      await onRun(rule);
    } finally {
      setRunningRule("");
    }
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Operación</span>
          <h1>Automatizaciones</h1>
        </div>
        <button className="primaryButton compact" onClick={() => run("all")} disabled={Boolean(runningRule)}>
          {runningRule === "all" ? <RefreshCw size={17} /> : <Play size={17} />}
          Ejecutar todo
        </button>
      </div>

      <div className="metricGrid overviewMetrics">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="metricCard" key={card.key}>
              <Icon size={18} />
              <span>{card.label}</span>
              <strong>{metrics[card.key] || 0}</strong>
            </article>
          );
        })}
      </div>

      <div className="automationGrid">
        <section className="panel automationRules">
          <h2>Reglas activas</h2>
          {rulesPager.pagedItems.map((rule) => (
            <article className="automationRule" key={rule.id}>
              <div>
                <ShieldCheck size={18} />
                <div>
                  <strong>{rule.title}</strong>
                  <p>{rule.description}</p>
                </div>
              </div>
              <button className="ghostButton" onClick={() => run(rule.id)} disabled={Boolean(runningRule)}>
                {runningRule === rule.id ? <RefreshCw size={16} /> : <Play size={16} />}
                Ejecutar
              </button>
            </article>
          ))}
          <PaginationControls {...rulesPager} />
        </section>

        <section className="panel automationPreview">
          <h2>Inventario crítico</h2>
          {preview.length === 0 && <div className="emptyState">Sin variantes bajo el mínimo.</div>}
          {previewPager.pagedItems.map((item) => (
            <div className="automationItem" key={`${item.productId}-${item.sku}`}>
              <div>
                <strong>{item.productName}</strong>
                <span>{item.variantLabel} · {item.supplier}</span>
              </div>
              <b>{item.stock} pz</b>
            </div>
          ))}
          <PaginationControls {...previewPager} />
        </section>
      </div>

      <section className="panel automationHistory">
        <h2>Historial</h2>
        {runs.length === 0 && <div className="emptyState">Aún no hay ejecuciones registradas.</div>}
        {runsPager.pagedItems.map((runItem) => (
          <article className="automationRun" key={runItem._id}>
            <div>
              <span>{formatDate(runItem.createdAt)} · {runItem.createdBy?.name || "Admin"}</span>
              <strong>{runItem.rule === "all" ? "Todas las reglas" : runItem.rule}</strong>
              <p>{runItem.summary}</p>
            </div>
            <div className="automationRunStats">
              <span>Hallazgos</span>
              <strong>{runItem.triggeredCount}</strong>
              <span>Cambios</span>
              <strong>{runItem.changedCount}</strong>
            </div>
          </article>
        ))}
        <PaginationControls {...runsPager} />
      </section>
    </section>
  );
}
