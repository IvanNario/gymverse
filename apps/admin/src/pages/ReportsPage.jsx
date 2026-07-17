import React from "react";
import { FileDown, Table2, TrendingUp } from "lucide-react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { money } from "../services/api.js";

const reports = [
  { kind: "sales", title: "Ventas", description: "Pedidos, estados, pagos, totales y puntos generados." },
  { kind: "registrations", title: "Registros", description: "Usuarios registrados, roles y puntos acumulados." },
  { kind: "payments", title: "Pagos", description: "Pagos de pedidos y cuotas de gimnasios afiliados." },
  { kind: "movements", title: "Movimientos", description: "Movimientos de stock y reabastecimientos registrados." },
];

function maxValue(items, key) {
  return Math.max(1, ...items.map((item) => Number(item[key] || 0)));
}

function RankingList({ title, items, valueKey, labelKey, subKey, format = (value) => value }) {
  const max = maxValue(items, valueKey);
  const itemsPager = usePagedItems(items);
  return (
    <section className="panel analyticsPanel">
      <h2>{title}</h2>
      <div className="analyticsList">
        {items.length === 0 && <div className="emptyState">Sin datos todavía.</div>}
        {itemsPager.pagedItems.map((item) => (
          <article className="analyticsRow" key={`${item[labelKey]}-${item.sku || item.email || item.month || item.code || ""}`}>
            <div>
              <strong>{item[labelKey]}</strong>
              {subKey && <span>{item[subKey]}</span>}
            </div>
            <b>{format(item[valueKey])}</b>
            <span className="barTrack"><i style={{ width: `${Math.max(6, (Number(item[valueKey] || 0) / max) * 100)}%` }} /></span>
          </article>
        ))}
      </div>
      <PaginationControls {...itemsPager} />
    </section>
  );
}

export function ReportsPage({ analytics, onDownload, onDownloadCsv }) {
  const summary = analytics?.summary || {};
  const lowStockProducts = analytics?.lowStockProducts || [];
  const lowStockPager = usePagedItems(lowStockProducts);

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Inteligencia comercial</span>
          <h1>Analítica y reportes</h1>
        </div>
      </div>

      <div className="metricGrid overviewMetrics">
        <article className="metricCard"><TrendingUp size={18} /><span>Ventas analizadas</span><strong>{money(summary.totalRevenue)}</strong></article>
        <article className="metricCard"><TrendingUp size={18} /><span>Margen estimado</span><strong>{money(summary.totalProfit)}</strong></article>
        <article className="metricCard"><TrendingUp size={18} /><span>Ticket promedio</span><strong>{money(summary.averageTicket)}</strong></article>
        <article className="metricCard"><TrendingUp size={18} /><span>Descuentos</span><strong>{money(summary.totalDiscount)}</strong></article>
      </div>

      <div className="analyticsGrid">
        <RankingList
          title="Productos con más venta"
          items={analytics?.topProducts || []}
          valueKey="revenue"
          labelKey="productName"
          subKey="variantLabel"
          format={money}
        />
        <RankingList
          title="Clientes frecuentes"
          items={analytics?.topCustomers || []}
          valueKey="revenue"
          labelKey="name"
          subKey="email"
          format={money}
        />
        <RankingList
          title="Ventas por mes"
          items={analytics?.monthlySales || []}
          valueKey="revenue"
          labelKey="month"
          subKey="orders"
          format={money}
        />
        <RankingList
          title="Rendimiento de cupones"
          items={analytics?.couponPerformance || []}
          valueKey="uses"
          labelKey="code"
          subKey="discount"
          format={(value) => `${value} uso(s)`}
        />
      </div>

      <section className="panel analyticsPanel">
        <h2>Alertas de stock bajo</h2>
        <div className="lowStockAnalytics">
          {lowStockProducts.length === 0 && <div className="emptyState">Sin alertas de stock bajo.</div>}
          {lowStockPager.pagedItems.map((item) => (
            <div className="listRow" key={item.sku}>
              <div>
                <strong>{item.productName}</strong>
                <span>{item.variantLabel} · {item.supplier}</span>
              </div>
              <b>{item.stock} pz</b>
            </div>
          ))}
        </div>
        <PaginationControls {...lowStockPager} />
      </section>

      <div className="pageHeader compactHeader">
        <div>
          <span>Exportaciones</span>
          <h1>Archivos descargables</h1>
        </div>
      </div>

      <div className="cardGrid fluid">
        {reports.map((report) => (
          <article className="entityCard" key={report.kind}>
            <span className="pill">PDF · CSV</span>
            <h2>{report.title}</h2>
            <p>{report.description}</p>
            <div className="entityActions">
              <button className="primaryButton compact" onClick={() => onDownload(report.kind)}>
                <FileDown size={16} />
                PDF
              </button>
              <button className="ghostButton" onClick={() => onDownloadCsv(report.kind)}>
                <Table2 size={16} />
                CSV
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
