import React, { useState } from "react";
import { ChevronDown, CreditCard, RotateCcw, Trash2, XCircle } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { money } from "../services/api.js";
import { validateReturnReason } from "../utils/forms.js";

const statusLabels = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  preparing: "Preparando",
  ready_for_pickup: "Listo para recoger",
  in_transit: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
  returned: "Devuelto",
};

const rewardStatusLabels = {
  requested: "Solicitado",
  preparing: "Preparando",
  ready_for_pickup: "Listo para recoger",
  in_transit: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const returnStatusLabels = {
  requested: "En revisión",
  approved: "Aprobada",
  rejected: "Rechazada",
  received: "Recibida",
  refunded: "Reembolsada",
};

const trackingSteps = {
  pickup: [
    { key: "preparing", label: "Preparando" },
    { key: "ready_for_pickup", label: "Listo para recoger" },
    { key: "delivered", label: "Entregado" },
  ],
  home: [
    { key: "preparing", label: "Preparando" },
    { key: "in_transit", label: "En camino" },
    { key: "delivered", label: "Entregado" },
  ],
};

function trackingIndex(order) {
  if (["cancelled", "returned"].includes(order.status)) return -1;
  if (order.status === "pending_payment" || order.status === "paid") return 0;
  const steps = trackingSteps[order.deliveryMethod] || trackingSteps.pickup;
  return Math.max(0, steps.findIndex((step) => step.key === order.status));
}

function OrderTimeline({ order }) {
  if (["cancelled", "returned"].includes(order.status)) {
    return <div className="orderException">{statusLabels[order.status]} · Este pedido ya no avanza en seguimiento.</div>;
  }

  const steps = trackingSteps[order.deliveryMethod] || trackingSteps.pickup;
  const activeIndex = trackingIndex(order);

  return (
    <div className="orderTimeline" aria-label="Seguimiento del pedido">
      {steps.map((step, index) => (
        <div className={`timelineStep ${index <= activeIndex ? "done" : ""}`} key={step.key}>
          <span>{index + 1}</span>
          <strong>{step.label}</strong>
        </div>
      ))}
    </div>
  );
}

function paymentTimeLeft(order) {
  if (!order.paymentExpiresAt) return "";
  const diff = new Date(order.paymentExpiresAt).getTime() - Date.now();
  if (diff <= 0) return "Tiempo vencido";
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return hours > 0 ? `${hours} h ${minutes} min restantes` : `${minutes} min restantes`;
}

export function OrdersPage({ orders, rewardOrders = [], returnRequests = [], onCancel, onPay, onRequestReturn, onClearHistory }) {
  const [openOrder, setOpenOrder] = useState("");
  const [selected, setSelected] = useState([]);
  const [returnReasons, setReturnReasons] = useState({});
  const [returnErrors, setReturnErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const ordersPager = usePagedItems(orders);
  const rewardsPager = usePagedItems(rewardOrders);

  const returnsByOrder = returnRequests.reduce((acc, item) => {
    const orderId = item.order?._id || item.order;
    acc[orderId] = item;
    return acc;
  }, {});

  function toggleSelected(id) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function clearSelected() {
    if (!selected.length) return;
    setConfirm({
      title: "Quitar del historial",
      message: "Estos pedidos dejarán de verse en tu historial visible. No se cancelarán ni se modificará su estado real.",
      confirmLabel: "Quitar",
      onConfirm: async () => {
        await onClearHistory(selected);
        setSelected([]);
        setConfirm(null);
      },
    });
  }

  function submitReturn(event, order) {
    event.preventDefault();
    const reason = returnReasons[order._id] || "";
    const validation = validateReturnReason(reason);
    if (validation) {
      setReturnErrors({ ...returnErrors, [order._id]: validation });
      return;
    }
    setConfirm({
      title: "Solicitar devolución",
      message: `Se enviará una solicitud de devolución para el pedido ${order.orderNumber}. El equipo revisará el caso antes de aprobarla.`,
      confirmLabel: "Enviar solicitud",
      onConfirm: async () => {
        setReturnErrors({ ...returnErrors, [order._id]: "" });
        await onRequestReturn(order._id, reason);
        setConfirm(null);
      },
    });
  }

  function confirmPay(order) {
    setConfirm({
      title: "Continuar al pago",
      message: `Te llevaremos a Mercado Pago para completar el pago del pedido ${order.orderNumber}.`,
      confirmLabel: "Pagar",
      danger: false,
      onConfirm: async () => {
        await onPay(order._id);
        setConfirm(null);
      },
    });
  }

  function confirmCancel(order) {
    setConfirm({
      title: "Cancelar pedido",
      message: `El pedido ${order.orderNumber} se marcará como cancelado. Esta acción no debe usarse si el pedido ya fue entregado.`,
      confirmLabel: "Cancelar pedido",
      onConfirm: async () => {
        await onCancel(order._id);
        setConfirm(null);
      },
    });
  }

  return (
    <section className="screen ordersScreen">
      <div className="sectionTop">
        <div>
          <span>Historial</span>
          <h1>Mis compras</h1>
        </div>
        <button className="ghostRound" onClick={clearSelected} aria-label="Eliminar pedidos seleccionados" disabled={!selected.length}>
          <Trash2 size={18} />
        </button>
      </div>
      <div className="selectionBar">
        <span>{selected.length ? `${selected.length} seleccionado(s)` : "Selecciona pedidos para quitarlos del historial visible"}</span>
        {selected.length > 0 && <button onClick={() => setSelected([])}>Limpiar selección</button>}
      </div>
      <div className="orderList">
        {orders.length === 0 && <div className="emptyCard">No hay pedidos visibles.</div>}
        {ordersPager.pagedItems.map((order) => {
          const isOpen = openOrder === order._id;
          const returnRequest = returnsByOrder[order._id];
          return (
            <article className={`orderCard detailed ${isOpen ? "open" : ""}`} key={order._id}>
              <button className="orderSummary" onClick={() => setOpenOrder(isOpen ? "" : order._id)}>
                <div className="orderSummaryMain">
                  <label className="orderSelect" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(order._id)}
                      onChange={() => toggleSelected(order._id)}
                      aria-label={`Seleccionar ${order.orderNumber}`}
                    />
                  </label>
                  <div>
                    <span className="pill">{statusLabels[order.status] || order.status}</span>
                    <h3>{order.orderNumber}</h3>
                    <p>{order.deliveryMethod === "pickup" ? order.pickupGym?.name : "Envío a domicilio"}</p>
                  </div>
                </div>
                <strong>{money(order.total)}</strong>
                <ChevronDown size={18} />
              </button>
              {isOpen && (
                <div className="orderDetail">
                  <OrderTimeline order={order} />
                  <div className="orderItems">
                    {order.items.map((item) => (
                      <div key={`${order._id}-${item.sku}`}>
                        <span>{item.quantity}x {item.productName}</span>
                        <strong>{money(item.price * item.quantity)}</strong>
                        <small>{item.variantLabel}</small>
                      </div>
                    ))}
                  </div>
                  <div className="totals mini">
                    <span>Subtotal</span><strong>{money(order.subtotal)}</strong>
                    <span>Entrega</span><strong>{money(order.shippingFee)}</strong>
                    {(order.discount || 0) > 0 && (
                      <>
                        <span>Descuento {order.discountCode ? `(${order.discountCode})` : ""}</span><strong>-{money(order.discount)}</strong>
                      </>
                    )}
                    <span>Total</span><strong>{money(order.total)}</strong>
                    <span>Pago</span><strong>{order.paymentMethod === "pickup" ? "Al recoger" : "Mercado Pago"}</strong>
                  </div>
                  {order.shippingAddress?.street && (
                    <p className="addressLine">{order.shippingAddress.street}, {order.shippingAddress.city}</p>
                  )}
                  {order.pickupCode && (
                    <div className="pickupCodeCard">
                      <span>Código de retiro</span>
                      <strong>{order.pickupCode}</strong>
                    </div>
                  )}
                  {returnRequest && (
                    <div className="returnStatusCard">
                      <span>Devolución</span>
                      <strong>{returnStatusLabels[returnRequest.status] || returnRequest.status}</strong>
                      {returnRequest.resolutionNote && <p>{returnRequest.resolutionNote}</p>}
                    </div>
                  )}
                  {order.status === "pending_payment" && order.paymentMethod === "mercado_pago" && (
                    <div className="pendingPaymentBox">
                      <div>
                        <strong>Pago pendiente</strong>
                        <span>{paymentTimeLeft(order) || "Tienes 24 horas para completar el pago."}</span>
                      </div>
                      <button
                        className="primaryButton"
                        onClick={() => confirmPay(order)}
                      >
                        <CreditCard size={18} />
                        Pagar ahora
                      </button>
                    </div>
                  )}
                  {order.status === "delivered" && !returnRequest && (
                    <form
                      className="returnForm"
                      onSubmit={(event) => submitReturn(event, order)}
                    >
                      <label>
                        <span>Solicitar devolución</span>
                        <textarea
                          value={returnReasons[order._id] || ""}
                          onChange={(event) => setReturnReasons({ ...returnReasons, [order._id]: event.target.value })}
                          placeholder="Cuéntanos qué pasó con tu pedido"
                          required
                        />
                      </label>
                      {returnErrors[order._id] && <p className="errorText">{returnErrors[order._id]}</p>}
                      <button className="dangerTextButton">
                        <RotateCcw size={18} />
                        Enviar solicitud
                      </button>
                    </form>
                  )}
                  {["pending_payment", "paid", "preparing"].includes(order.status) && (
                    <button
                      className="dangerTextButton"
                      onClick={() => confirmCancel(order)}
                    >
                      <XCircle size={18} />
                      Cancelar pedido
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      <PaginationControls {...ordersPager} />
      <ConfirmDialog open={Boolean(confirm)} {...(confirm || {})} onCancel={() => setConfirm(null)} />
      <div className="rewardHistory">
        <div className="sectionTop compact">
          <div>
            <span>Canjes</span>
            <h1>Recompensas</h1>
          </div>
        </div>
        <div className="orderList">
          {rewardOrders.length === 0 && <div className="emptyCard">No hay recompensas solicitadas.</div>}
          {rewardsPager.pagedItems.map((order) => (
            <article className="orderCard rewardOrderCard" key={order._id}>
              <div>
                <span className="pill">{rewardStatusLabels[order.status] || order.status}</span>
                <h3>{order.rewardNumber}</h3>
                <p>{order.pickupGym?.name || "Recompensa GymVerse"}</p>
              </div>
              <strong>{order.totalPoints} pts</strong>
              <div className="orderItems">
                {order.items.map((item) => (
                  <div key={`${order._id}-${item.sku}`}>
                    <span>{item.quantity}x {item.productName}</span>
                    <small>{item.variantLabel}</small>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <PaginationControls {...rewardsPager} />
      </div>
    </section>
  );
}
