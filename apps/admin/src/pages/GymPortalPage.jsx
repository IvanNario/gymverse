import React, { useMemo, useState } from "react";
import { BarChart3, Boxes, CheckCircle2, CreditCard, LogOut, PackageCheck, Repeat2, Send, Search, ShieldCheck, Truck } from "lucide-react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { money } from "../services/api.js";

const statusLabels = {
  paid: "Pagado",
  preparing: "Preparando",
  ready_for_pickup: "Listo para recoger",
  delivered: "Entregado",
  cancelled: "Cancelado",
  returned: "Devuelto",
};

const paymentLabels = {
  pending: "Pendiente",
  paid: "Pagado",
  refunded: "Reembolsado",
};

function PickupConfirmation({ order, onConfirmPickup }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await onConfirmPickup(order._id, code);
      setCode("");
    } catch (err) {
      setError(err.message);
    }
  }

  if (order.status === "delivered") {
    return (
      <div className="pickupDone">
        <CheckCircle2 size={18} />
        Entregado
      </div>
    );
  }

  return (
    <form className="pickupConfirm" onSubmit={submit}>
      <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código de retiro" inputMode="numeric" />
      <button className="primaryButton compact">
        <ShieldCheck size={16} />
        Confirmar
      </button>
      {error && <small>{error}</small>}
    </form>
  );
}

const requestLabels = {
  requested: "Solicitado",
  transferred: "Traslado confirmado",
  cancelled: "Cancelado",
};

const emptyRestockLine = { productId: "", sku: "", quantity: 1 };

function restockLineKey(item) {
  return item.productId && item.sku ? `${item.productId}:${item.sku}` : "";
}

const gymNav = [
  { id: "summary", label: "Resumen", icon: BarChart3 },
  { id: "orders", label: "Pedidos", icon: PackageCheck },
  { id: "stock", label: "Stock local", icon: Boxes },
  { id: "restock", label: "Reabastecer", icon: Repeat2 },
];

export function GymPortalPage({ user, orders, products = [], stock = [], restockRequests = [], onStatus, onPayment, onConfirmPickup, onCreateRestockRequest, onLogout }) {
  const [view, setView] = useState("summary");
  const [query, setQuery] = useState("");
  const [restockItems, setRestockItems] = useState([emptyRestockLine]);
  const [restockNote, setRestockNote] = useState("");
  const [restockError, setRestockError] = useState("");
  const activeOrders = orders.filter((order) => !["delivered", "cancelled", "returned"].includes(order.status));
  const readyOrders = orders.filter((order) => order.status === "ready_for_pickup");
  const pendingPayments = orders.filter((order) => order.paymentStatus === "pending");
  const stockBySku = new Map(stock.map((item) => [`${item.product?._id || item.product}:${item.sku}`, Number(item.quantity || 0)]));

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return orders;
    return orders.filter((order) => {
      return (
        [order.orderNumber, order.customer?.name, order.customer?.email, order.pickupCode]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized)) ||
        order.items.some((item) => [item.productName, item.sku].some((value) => String(value).toLowerCase().includes(normalized)))
      );
    });
  }, [orders, query]);
  const stockPager = usePagedItems(stock);
  const restockRequestsPager = usePagedItems(restockRequests);
  const ordersPager = usePagedItems(filteredOrders);

  function updateRestockItem(index, patch) {
    setRestockItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function validateRestockItems() {
    const selected = restockItems.filter((item) => item.productId || item.sku || Number(item.quantity || 0) > 1);
    if (!selected.length) return "Selecciona al menos un producto";
    if (selected.length > 20) return "La guía no puede tener más de 20 líneas";

    const requestedBySku = new Map();
    for (const item of selected) {
      if (!item.productId || !item.sku) return "Completa producto y variante en cada línea";
      const quantity = Number(item.quantity || 0);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return "Cada cantidad debe ser de 1 a 10 piezas";
      const product = products.find((entry) => entry._id === item.productId);
      const variant = product?.variants.find((entry) => entry.sku === item.sku);
      if (!product || !variant) return "Uno de los productos seleccionados ya no está disponible";
      const key = restockLineKey(item);
      requestedBySku.set(key, (requestedBySku.get(key) || 0) + quantity);
      const currentStock = stockBySku.get(key) || 0;
      if (currentStock + requestedBySku.get(key) > 10) return `${product.name} · ${variant.label} supera el máximo de 10 piezas en gimnasio`;
      if (Number(variant.stock || 0) < requestedBySku.get(key)) return `Stock central insuficiente para ${product.name} · ${variant.label}`;
    }
    return "";
  }

  async function submitRestockRequest(event) {
    event.preventDefault();
    setRestockError("");
    const validation = validateRestockItems();
    if (validation) {
      setRestockError(validation);
      return;
    }
    const items = restockItems.filter((item) => item.productId && item.sku && Number(item.quantity || 0) > 0);
    try {
      await onCreateRestockRequest({ items, note: restockNote });
      setRestockItems([emptyRestockLine]);
      setRestockNote("");
    } catch (error) {
      setRestockError(error.message);
    }
  }

  return (
    <>
      <aside className="sidebar gymSidebar">
        <div className="brand">
          <img src="/logo-white-bg.png" alt="GymVerse" />
          <div>
            <strong>GymVerse</strong>
            <span>Gimnasio</span>
          </div>
        </div>
        <nav>
          <span className="sidebarSection">Operación</span>
          {gymNav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)} type="button">
                <Icon size={18} />
                <span>{item.label}</span>
                {item.id === "orders" && activeOrders.length > 0 && <strong className="sidebarBadge">{activeOrders.length}</strong>}
              </button>
            );
          })}
        </nav>
        <button className="logoutButton" onClick={onLogout}>
          <LogOut size={18} />
          <span>Salir</span>
        </button>
      </aside>

      <section className="workspace gymPortal">
        <header className="gymHeader">
          <div className="brand">
            <img src="/logo-white-bg.png" alt="GymVerse" />
            <div>
              <strong>Portal de gimnasio</strong>
              <span>{user.name}</span>
            </div>
          </div>
          <div className="gymHeaderStatus">
            <span>Cuenta activa</span>
            <span>{user.name}</span>
          </div>
        </header>

        {view === "summary" && (
          <>
            <div className="pageHeader">
              <div>
                <span>Recepción</span>
                <h1>Resumen del gimnasio</h1>
              </div>
            </div>

            <section className="metricGrid">
              <article className="metricCard">
                <PackageCheck size={20} />
                <span>Activos</span>
                <strong>{activeOrders.length}</strong>
              </article>
              <article className="metricCard">
                <CheckCircle2 size={20} />
                <span>Listos</span>
                <strong>{readyOrders.length}</strong>
              </article>
              <article className="metricCard">
                <CreditCard size={20} />
                <span>Pagos pendientes</span>
                <strong>{pendingPayments.length}</strong>
              </article>
              <article className="metricCard">
                <Truck size={20} />
                <span>Stock local</span>
                <strong>{stock.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</strong>
              </article>
            </section>

            <section className="gymSummaryGrid">
              <article className="panel">
                <div className="editorTitle">
                  <div>
                    <span>Próxima acción</span>
                    <h2>Pedidos listos</h2>
                  </div>
                  <CheckCircle2 size={20} />
                </div>
                <p className="formHint">Confirma la entrega usando el código de retiro del cliente.</p>
                <button className="primaryButton compact" type="button" onClick={() => setView("orders")}>
                  Ver pedidos
                </button>
              </article>
              <article className="panel">
                <div className="editorTitle">
                  <div>
                    <span>Inventario</span>
                    <h2>{stock.length} producto(s)</h2>
                  </div>
                  <Boxes size={20} />
                </div>
                <p className="formHint">El stock local por artículo se mantiene con máximo de 10 piezas.</p>
                <button className="ghostButton" type="button" onClick={() => setView("stock")}>
                  Revisar stock
                </button>
              </article>
            </section>
          </>
        )}

        {view === "stock" && (
          <>
            <div className="pageHeader">
              <div>
                <span>Inventario local</span>
                <h1>Stock del gimnasio</h1>
              </div>
            </div>
            <section className="panel gymLocalStock">
              <div className="editorTitle">
                <div>
                  <span>Disponible para recoger</span>
                  <h2>Stock del gimnasio</h2>
                </div>
                <strong>{stock.length}</strong>
              </div>
              <div className="gymStockList">
                {stockPager.pagedItems.map((item) => (
                  <article className="gymStockItem" key={item._id}>
                    <div>
                      <strong>{item.productName}</strong>
                      <span>{item.variantLabel} · {item.sku}</span>
                    </div>
                    <strong>{item.quantity}/10</strong>
                  </article>
                ))}
                {stock.length === 0 && <div className="emptyState">Este gimnasio aún no tiene stock local.</div>}
              </div>
              <PaginationControls {...stockPager} />
            </section>
          </>
        )}

        {view === "restock" && (
          <>
            <div className="pageHeader">
              <div>
                <span>Guía al administrador</span>
                <h1>Reabastecimiento</h1>
              </div>
            </div>
            <section className="gymStockWorkspace">
              <form className="panel gymRestockForm" onSubmit={submitRestockRequest}>
                <div className="editorTitle">
                  <div>
                    <span>Guía al administrador</span>
                    <h2>Solicitar reabastecimiento</h2>
                  </div>
                  <button className="primaryButton compact">
                    <Send size={16} />
                    Enviar
                  </button>
                </div>
                {restockItems.map((item, index) => {
                  const product = products.find((entry) => entry._id === item.productId);
                  const currentStock = item.productId && item.sku ? stockBySku.get(`${item.productId}:${item.sku}`) || 0 : 0;
                  return (
                    <div className="gymRestockRow" key={index}>
                      <select value={item.productId} onChange={(event) => updateRestockItem(index, { productId: event.target.value, sku: "" })}>
                        <option value="">Producto</option>
                        {products.map((productItem) => (
                          <option key={productItem._id} value={productItem._id}>
                            {productItem.name}
                          </option>
                        ))}
                      </select>
                      <select value={item.sku} onChange={(event) => updateRestockItem(index, { sku: event.target.value })}>
                        <option value="">Variante</option>
                        {(product?.variants || []).map((variant) => (
                          <option key={variant.sku} value={variant.sku}>
                            {variant.label} · central {variant.stock} pz
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max={Math.max(1, 10 - currentStock)}
                        value={item.quantity}
                        onChange={(event) => updateRestockItem(index, { quantity: event.target.value })}
                      />
                      <small>{item.sku ? `${currentStock}/10 en gimnasio` : "Máximo 10 pz"}</small>
                    </div>
                  );
                })}
                <button className="ghostButton" type="button" onClick={() => setRestockItems((current) => (current.length >= 20 ? current : [...current, emptyRestockLine]))} disabled={restockItems.length >= 20}>
                  Agregar línea
                </button>
                <textarea value={restockNote} onChange={(event) => setRestockNote(event.target.value)} placeholder="Notas para administración" />
                {restockError && <p className="errorText">{restockError}</p>}
              </form>

              <section className="panel">
                <div className="editorTitle">
                  <div>
                    <span>Seguimiento</span>
                    <h2>Solicitudes enviadas</h2>
                  </div>
                </div>
                <div className="gymRequestList">
                  {restockRequestsPager.pagedItems.map((request) => (
                    <article className="gymRequestCard" key={request._id}>
                      <div>
                        <span className="pill">{requestLabels[request.status] || request.status}</span>
                        <strong>{request.requestNumber}</strong>
                        <small>{request.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} pieza(s)</small>
                      </div>
                      <span>{new Date(request.createdAt).toLocaleDateString("es-MX")}</span>
                    </article>
                  ))}
                  {restockRequests.length === 0 && <div className="emptyState">No has enviado solicitudes de reabastecimiento.</div>}
                </div>
                <PaginationControls {...restockRequestsPager} />
              </section>
            </section>
          </>
        )}

        {view === "orders" && (
          <>
            <div className="pageHeader">
              <div>
                <span>Recepción</span>
                <h1>Pedidos para recoger</h1>
              </div>
            </div>
            <label className="searchField gymSearch">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedido, cliente, código o producto" />
            </label>

            <div className="gymOrderList">
              {ordersPager.pagedItems.map((order) => (
                <article className="gymOrderCard" key={order._id}>
                  <div className="gymOrderTop">
                    <div>
                      <span className="pill">{statusLabels[order.status] || order.status}</span>
                      <h2>{order.orderNumber}</h2>
                      <p>{order.customer?.name} · {order.customer?.email}</p>
                    </div>
                    <strong>{money(order.total)}</strong>
                  </div>

                  <div className="gymOrderMeta">
                    <div>
                      <span>Código</span>
                      <strong>{order.pickupCode || "Sin código"}</strong>
                    </div>
                    <div>
                      <span>Pago</span>
                      <strong>{paymentLabels[order.paymentStatus] || order.paymentStatus}</strong>
                    </div>
                    <div>
                      <span>Productos</span>
                      <strong>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</strong>
                    </div>
                  </div>

                  <div className="orderItems">
                    {order.items.map((item) => (
                      <div key={`${order._id}-${item.sku}`}>
                        <span>{item.quantity}x {item.productName}</span>
                        <strong>{item.sku}</strong>
                        <small>{item.variantLabel}</small>
                      </div>
                    ))}
                  </div>

                  <div className="gymOrderActions">
                    <select value={order.status} onChange={(event) => onStatus(order._id, event.target.value)} disabled={order.status === "delivered"}>
                      <option value="preparing">Preparando</option>
                      <option value="ready_for_pickup">Listo para recoger</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                    <select value={order.paymentStatus || "paid"} onChange={(event) => onPayment(order._id, event.target.value)}>
                      <option value="pending">Pago pendiente</option>
                      <option value="paid">Pagado</option>
                      <option value="refunded">Reembolsado</option>
                    </select>
                    <PickupConfirmation order={order} onConfirmPickup={onConfirmPickup} />
                  </div>
                </article>
              ))}
              {filteredOrders.length === 0 && <div className="emptyState">No hay pedidos para este gimnasio.</div>}
            </div>
            <PaginationControls {...ordersPager} />
          </>
        )}
      </section>
    </>
  );
}
