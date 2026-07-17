import React from "react";
import { Banknote, CreditCard, TrendingUp, WalletCards } from "lucide-react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { money } from "../services/api.js";

function maxValue(items, key) {
  return Math.max(1, ...items.map((item) => Number(item[key] || 0)));
}

export function FinancePage({ finance = {} }) {
  const summary = finance.summary || {};
  const monthly = finance.monthly || [];
  const pendingPayments = finance.pendingPayments || [];
  const maxRevenue = maxValue(monthly, "revenue");
  const monthlyPager = usePagedItems(monthly);
  const pendingPaymentsPager = usePagedItems(pendingPayments);

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Finanzas</span>
          <h1>Dashboard financiero</h1>
        </div>
      </div>

      <div className="metricGrid overviewMetrics">
        <article className="metricCard"><WalletCards size={18} /><span>Ingresos brutos</span><strong>{money(summary.grossRevenue)}</strong></article>
        <article className="metricCard"><TrendingUp size={18} /><span>Utilidad estimada</span><strong>{money(summary.estimatedProfit)}</strong></article>
        <article className="metricCard"><Banknote size={18} /><span>Afiliaciones pagadas</span><strong>{money(summary.affiliatePaid)}</strong></article>
        <article className="metricCard"><CreditCard size={18} /><span>Pendiente por cobrar</span><strong>{money((summary.pendingRevenue || 0) + (summary.affiliatePending || 0))}</strong></article>
      </div>

      <div className="financeGrid">
        <section className="panel analyticsPanel">
          <h2>Tendencia mensual</h2>
          <div className="analyticsList">
            {monthly.length === 0 && <div className="emptyState">Sin ventas pagadas todavía.</div>}
            {monthlyPager.pagedItems.map((item) => (
              <article className="analyticsRow" key={item.month}>
                <div>
                  <strong>{item.month}</strong>
                  <span>{item.orders} pedido(s) · utilidad {money(item.profit)}</span>
                </div>
                <b>{money(item.revenue)}</b>
                <span className="barTrack"><i style={{ width: `${Math.max(6, (Number(item.revenue || 0) / maxRevenue) * 100)}%` }} /></span>
              </article>
            ))}
          </div>
          <PaginationControls {...monthlyPager} />
        </section>

        <section className="panel analyticsPanel">
          <h2>Conciliación</h2>
          <div className="financeBreakdown">
            <div><span>Ventas pagadas</span><strong>{money(summary.orderRevenue)}</strong></div>
            <div><span>Costo de producto</span><strong>{money(summary.costOfGoods)}</strong></div>
            <div><span>Reabastecido este mes</span><strong>{money(summary.restockSpend)}</strong></div>
            <div><span>Afiliaciones esperadas</span><strong>{money(summary.affiliateExpected)}</strong></div>
            <div><span>Reembolsos</span><strong>{money(summary.refundedRevenue)}</strong></div>
          </div>
        </section>
      </div>

      <section className="panel dataPanel">
        <h2>Pagos pendientes</h2>
        <div className="dataTable">
          <div className="dataTableHead finance">
            <span>Tipo</span>
            <span>Referencia</span>
            <span>Entidad</span>
            <span>Estado</span>
            <span>Monto</span>
          </div>
          {pendingPayments.length === 0 && <div className="emptyState">No hay pagos pendientes.</div>}
          {pendingPaymentsPager.pagedItems.map((payment) => (
            <div className="dataTableRow finance" key={`${payment.type}-${payment.reference}`}>
              <span>{payment.type}</span>
              <strong>{payment.reference}</strong>
              <span>{payment.entity}</span>
              <span>{payment.status}</span>
              <b>{money(payment.amount)}</b>
            </div>
          ))}
        </div>
        <PaginationControls {...pendingPaymentsPager} />
      </section>
    </section>
  );
}
