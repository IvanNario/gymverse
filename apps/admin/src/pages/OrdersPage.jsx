import React, { useState } from "react";
import { Archive, ArchiveRestore, ChevronDown, FileDown, Search } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { money } from "../services/api.js";

const statusOptions = ["pending_payment", "paid", "preparing", "ready_for_pickup", "in_transit", "delivered", "cancelled", "returned"];
const paymentOptions = ["pending", "paid", "refunded"];
const statusLabels = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  preparing: "Preparando",
  ready_for_pickup: "Listo para recoger",
  in_transit: "En tránsito",
  delivered: "Entregado",
  cancelled: "Cancelado",
  returned: "Devuelto",
};
const paymentLabels = {
  pending: "Pendiente",
  paid: "Pagado",
  refunded: "Reembolsado",
};

function paymentMethodLabel(order) {
  if (order.paymentMethod === "pickup") return "Al recoger";
  if (order.paymentMethod === "mercado_pago") return "Mercado Pago";
  return "Pago externo";
}

export function OrdersPage({ orders, onStatus, onPayment, onDownloadGuide, onArchive, onRestore, archived = false }) {
  const [openOrder, setOpenOrder] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [confirm, setConfirm] = useState(null);

  const filteredOrders = orders.filter((order) => {
    const normalized = query.trim().toLowerCase();
    const matchesQuery =
      !normalized ||
      [order.orderNumber, order.customer?.name, order.customer?.email, order.pickupGym?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)) ||
      order.items.some((item) => [item.productName, item.sku, item.variantLabel].some((value) => String(value).toLowerCase().includes(normalized)));
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;
    const matchesDelivery = deliveryFilter === "all" || order.deliveryMethod === deliveryFilter;
    return matchesQuery && matchesStatus && matchesPayment && matchesDelivery;
  });
  const ordersPager = usePagedItems(filteredOrders);

  function confirmArchiveOrder(order) {
    setConfirm({
      title: "Archivar pedido",
      message: `El pedido ${order.orderNumber} se moverá a Pedidos archivados y dejará de aparecer en la lista principal.`,
      confirmLabel: "Archivar",
      onConfirm: async () => {
        await onArchive(order._id);
        setConfirm(null);
      },
    });
  }

  function confirmRestoreOrder(order) {
    setConfirm({
      title: "Restaurar pedido",
      message: `El pedido ${order.orderNumber} volverá a la lista principal de pedidos.`,
      confirmLabel: "Restaurar",
      danger: false,
      onConfirm: async () => {
        await onRestore(order._id);
        setConfirm(null);
      },
    });
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Ventas</span>
          <h1>{archived ? "Pedidos archivados" : "Pedidos"}</h1>
        </div>
      </div>
      <section className="filterPanel">
        <label className="searchField">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por pedido, cliente, producto o SKU" />
        </label>
        <label>
          <span>Estado</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Todos</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{statusLabels[status]}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Pago</span>
          <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            <option value="all">Todos</option>
            {paymentOptions.map((status) => (
              <option key={status} value={status}>{paymentLabels[status]}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Entrega</span>
          <select value={deliveryFilter} onChange={(event) => setDeliveryFilter(event.target.value)}>
            <option value="all">Todas</option>
            <option value="pickup">Retiro en gimnasio</option>
            <option value="home">Domicilio</option>
          </select>
        </label>
      </section>
      <div className="resultMeta">{filteredOrders.length} pedido(s) encontrados</div>
      <div className="table">
        <div className="tableHead orders">
          <span>Pedido</span>
          <span>Cliente</span>
          <span>Entrega</span>
          <span>Total</span>
          <span>Pago</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>
        {ordersPager.pagedItems.map((order) => (
          <article className="tableGroup" key={order._id}>
            <div className="tableRow orders">
              <strong data-label="Pedido">{order.orderNumber}</strong>
              <span data-label="Cliente">{order.customer?.name}</span>
              <span data-label="Entrega">{order.deliveryMethod === "pickup" ? order.pickupGym?.name : "Domicilio"}</span>
              <span data-label="Total">{money(order.total)}</span>
              {archived ? (
                <span data-label="Pago">{paymentLabels[order.paymentStatus] || order.paymentStatus}</span>
              ) : (
                <label className="mobileSelectCell" data-label="Pago">
                  <select value={order.paymentStatus || "paid"} onChange={(event) => onPayment(order._id, event.target.value)}>
                    {paymentOptions.map((status) => (
                      <option key={status} value={status}>
                        {paymentLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {archived ? (
                <span data-label="Estado">{statusLabels[order.status] || order.status}</span>
              ) : (
                <label className="mobileSelectCell" data-label="Estado">
                  <select value={order.status} onChange={(event) => onStatus(order._id, event.target.value)}>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="rowActions orderActions">
                <button
                  className="ghostButton summaryButton"
                  onClick={() => setOpenOrder(openOrder === order._id ? "" : order._id)}
                  aria-label={openOrder === order._id ? "Ocultar resumen" : "Ver resumen"}
                  title={openOrder === order._id ? "Ocultar resumen" : "Ver resumen"}
                >
                  <ChevronDown size={16} />
                  Resumen
                </button>
                <button className="ghostIcon" onClick={() => onDownloadGuide(order)} aria-label="Descargar PDF" title="Descargar PDF">
                  <FileDown size={16} />
                </button>
                {!archived && order.status === "cancelled" && (
                  <button className="ghostIcon" onClick={() => confirmArchiveOrder(order)} aria-label="Archivar pedido" title="Archivar pedido">
                    <Archive size={16} />
                  </button>
                )}
                {archived && (
                  <button className="ghostIcon" onClick={() => confirmRestoreOrder(order)} aria-label="Restaurar pedido" title="Restaurar pedido">
                    <ArchiveRestore size={16} />
                  </button>
                )}
              </div>
            </div>
            {openOrder === order._id && (
              <div className="orderAdminDetail">
                <div className="orderItems">
                  {order.items.map((item) => (
                    <div key={`${order._id}-${item.sku}`}>
                      <span>{item.quantity}x {item.productName}</span>
                      <strong>{money(item.price * item.quantity)}</strong>
                      <small>{item.variantLabel} · {item.sku}</small>
                    </div>
                  ))}
                </div>
                <div className="totals mini">
                  <span>Subtotal</span><strong>{money(order.subtotal)}</strong>
                  <span>Envío</span><strong>{money(order.shippingFee)}</strong>
                  <span>Total</span><strong>{money(order.total)}</strong>
                  <span>Método de pago</span><strong>{paymentMethodLabel(order)}</strong>
                  <span>Puntos generados</span><strong>{order.pointsEarned || 0}</strong>
                </div>
              </div>
            )}
          </article>
        ))}
        {filteredOrders.length === 0 && <div className="emptyState">{archived ? "No hay pedidos archivados." : "No hay pedidos que coincidan con la búsqueda."}</div>}
      </div>
      <PaginationControls {...ordersPager} />
      <ConfirmDialog open={Boolean(confirm)} {...(confirm || {})} onCancel={() => setConfirm(null)} />
    </section>
  );
}
