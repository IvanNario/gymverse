import React from "react";
import { AlertTriangle, Boxes, Building2, CheckCircle2, CreditCard, PackageCheck, TrendingUp, Truck, UsersRound } from "lucide-react";
import { money } from "../services/api.js";

const paymentLabels = {
  pending: "pendiente",
  paid: "pagado",
  refunded: "reembolsado",
};

function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function EmptyPanel({ children }) {
  return <div className="overviewEmpty">{children}</div>;
}

export function OverviewPage({ stats, orders, products, restocks }) {
  const pendingPayments = (stats.pendingOrderPayments || 0) + (stats.pendingGymPayments || 0);
  const profitMargin = stats.revenue > 0 ? stats.profit / stats.revenue : 0;
  const recentOrders = orders.slice(0, 4);
  const completedOrders = orders.filter((order) => order.status === "delivered").slice(0, 3);
  const lowStockItems = products
    .flatMap((product) =>
      product.variants
        .filter((variant) => variant.stock < 10)
        .map((variant) => ({
          productName: product.name,
          variantLabel: variant.label,
          stock: variant.stock,
        }))
    )
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 4);

  const statusCards = [
    { label: "Pedidos activos", value: stats.activeOrders, helper: `${stats.completedOrders || 0} finalizados`, icon: PackageCheck },
    { label: "Clientes", value: stats.customers, helper: "registrados", icon: UsersRound },
    { label: "Gimnasios activos", value: stats.activeGyms, helper: `${stats.inactiveGyms || 0} no activos`, icon: Building2 },
    { label: "Proveedores", value: stats.activeSuppliers, helper: `${stats.inactiveSuppliers || 0} no activos`, icon: Truck },
  ];

  const alerts = [
    { label: "Pagos pendientes", value: pendingPayments, helper: `${stats.pendingOrderPayments || 0} pedidos · ${stats.pendingGymPayments || 0} gimnasios`, icon: CreditCard },
    { label: "Stock bajo", value: stats.lowStock, helper: "productos por revisar", icon: AlertTriangle },
    { label: "Reabastecido", value: money(stats.restockSpend), helper: "invertido este mes", icon: Boxes },
  ];

  return (
    <section className="page overviewPage">
      <div className="pageHeader">
        <div>
          <span>Operación</span>
          <h1>Resumen</h1>
        </div>
      </div>

      <div className="overviewTopGrid">
        <section className="overviewHeroPanel">
          <div>
            <span>Ventas acumuladas</span>
            <h2>{money(stats.revenue)}</h2>
            <p>Ganancia estimada de {money(stats.profit)} con margen de {percent(profitMargin)}.</p>
          </div>
          <TrendingUp size={34} />
          <div className="overviewHeroStats">
            <div>
              <span>Mes actual</span>
              <strong>{money(stats.currentProfit)}</strong>
            </div>
            <div>
              <span>Mes anterior</span>
              <strong>{money(stats.previousProfit)}</strong>
            </div>
            <div className={stats.profitDelta >= 0 ? "positive" : "negative"}>
              <span>Diferencia</span>
              <strong>{money(stats.profitDelta)}</strong>
            </div>
          </div>
        </section>

        <section className="panel overviewAlertsPanel">
          <h2>Atención Operativa</h2>
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <div className="overviewAlertRow" key={alert.label}>
                <Icon size={17} />
                <div>
                  <strong>{alert.label}</strong>
                  <span>{alert.helper}</span>
                </div>
                <b>{alert.value}</b>
              </div>
            );
          })}
        </section>
      </div>

      <div className="overviewStatusGrid">
        {statusCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="overviewStatusCard" key={card.label}>
              <Icon size={18} />
              <div>
                <span>{card.label}</span>
                <strong>{card.value || 0}</strong>
                <small>{card.helper}</small>
              </div>
            </article>
          );
        })}
      </div>

      <div className="overviewWorkGrid">
        <section className="panel overviewListBlock large">
          <div className="overviewPanelTitle">
            <h2>Pedidos Recientes</h2>
            <span>{orders.length} total</span>
          </div>
          {recentOrders.length === 0 && <EmptyPanel>No hay pedidos recientes.</EmptyPanel>}
          {recentOrders.map((order) => (
            <div className="overviewOrderRow" key={order._id}>
              <div>
                <strong>{order.orderNumber}</strong>
                <span>{order.customer?.name || "Cliente"} · pago {paymentLabels[order.paymentStatus] || order.paymentStatus}</span>
              </div>
              <b>{money(order.total)}</b>
            </div>
          ))}
        </section>

        <section className="panel overviewListBlock">
          <div className="overviewPanelTitle">
            <h2>Finalizados</h2>
            <CheckCircle2 size={18} />
          </div>
          {completedOrders.length === 0 && <EmptyPanel>Sin pedidos entregados todavía.</EmptyPanel>}
          {completedOrders.map((order) => (
            <div className="overviewMiniRow" key={order._id}>
              <strong>{order.orderNumber}</strong>
              <span>{money(order.total)}</span>
            </div>
          ))}
        </section>

        <section className="panel overviewListBlock">
          <div className="overviewPanelTitle">
            <h2>Stock Bajo</h2>
            <Boxes size={18} />
          </div>
          {lowStockItems.length === 0 && <EmptyPanel>Inventario sin alertas.</EmptyPanel>}
          {lowStockItems.map((item) => (
            <div className="overviewMiniRow" key={`${item.productName}-${item.variantLabel}`}>
              <div>
                <strong>{item.productName}</strong>
                <span>{item.variantLabel}</span>
              </div>
              <b>{item.stock} pz</b>
            </div>
          ))}
        </section>

        <section className="panel overviewListBlock">
          <div className="overviewPanelTitle">
            <h2>Reabastecimientos</h2>
            <Truck size={18} />
          </div>
          {restocks.length === 0 && <EmptyPanel>Sin movimientos recientes.</EmptyPanel>}
          {restocks.slice(0, 3).map((movement) => (
            <div className="overviewMiniRow" key={movement._id}>
              <div>
                <strong>{movement.productName}</strong>
                <span>{movement.quantity} pz · {movement.variantLabel}</span>
              </div>
              <b>{money(movement.totalCost)}</b>
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}
