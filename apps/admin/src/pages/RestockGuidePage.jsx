import React, { useState } from "react";
import { CheckCircle2, FileDown, Plus, Search, Trash2, Truck, XCircle } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { money } from "../services/api.js";

const emptyLine = { productId: "", sku: "", quantity: 1, unitCost: 0 };

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function guideSuppliers(guide) {
  return Array.from(new Set((guide.items || []).map((item) => item.supplierName).filter(Boolean)));
}

const gymRequestLabels = {
  requested: "Pendiente",
  transferred: "Traslado confirmado",
  cancelled: "Cancelada",
};

export function RestockGuidePage({ products, guides = [], gymRequests = [], gymStock = [], onDownload, onDownloadHistory, onConfirmGymRequest, onCancelGymRequest }) {
  const [items, setItems] = useState([emptyLine]);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historySupplier, setHistorySupplier] = useState("all");
  const [gymRequestError, setGymRequestError] = useState("");
  const [confirm, setConfirm] = useState(null);

  const suppliers = Array.from(
    new Map(
      products
        .map((product) => product.supplier)
        .filter(Boolean)
        .map((supplier) => [supplier._id, supplier])
    ).values()
  );

  const filteredProducts =
    supplierFilter === "all" ? products : products.filter((product) => product.supplier?._id === supplierFilter);

  const historySuppliers = Array.from(new Set(guides.flatMap((guide) => guideSuppliers(guide)))).sort();
  const filteredGuides = guides.filter((guide) => {
    const normalized = historyQuery.trim().toLowerCase();
    const text = [
      guide.guideNumber,
      ...guideSuppliers(guide),
      ...(guide.items || []).flatMap((item) => [item.productName, item.variantLabel, item.sku]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuery = !normalized || text.includes(normalized);
    const matchesSupplier = historySupplier === "all" || guideSuppliers(guide).includes(historySupplier);
    return matchesQuery && matchesSupplier;
  });
  const guidesPager = usePagedItems(filteredGuides);
  const gymRequestsPager = usePagedItems(gymRequests);

  function updateItem(index, patch) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function selectedProduct(productId) {
    return products.find((product) => product._id === productId);
  }

  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);

  function validateGymRequest(request) {
    if (!request?.items?.length) return "La solicitud no tiene productos";
    if (request.status !== "requested") return "Esta solicitud ya fue procesada";
    const localStockBySku = new Map(
      gymStock
        .filter((entry) => String(entry.gym?._id || entry.gym) === String(request.gym?._id || request.gym))
        .map((entry) => [`${entry.product?._id || entry.product}:${entry.sku}`, Number(entry.quantity || 0)])
    );
    const requestedBySku = new Map();
    for (const item of request.items) {
      const key = `${item.product?._id || item.product}:${item.sku}`;
      requestedBySku.set(key, (requestedBySku.get(key) || 0) + Number(item.quantity || 0));
      const product = products.find((entry) => String(entry._id) === String(item.product?._id || item.product));
      const variant = product?.variants.find((entry) => entry.sku === item.sku);
      if (!product || !variant) return `${item.productName} ya no está disponible`;
      if ((localStockBySku.get(key) || 0) + requestedBySku.get(key) > 10) return `${item.productName} ${item.variantLabel} supera el máximo de 10 piezas en gimnasio`;
      if (Number(variant.stock || 0) < requestedBySku.get(key)) return `Stock central insuficiente para ${item.productName} ${item.variantLabel}`;
    }
    return "";
  }

  async function confirmGymRequest(request) {
    const validation = validateGymRequest(request);
    if (validation) {
      setGymRequestError(validation);
      return;
    }
    setGymRequestError("");
    try {
      await onConfirmGymRequest(request._id);
    } catch (error) {
      setGymRequestError(error.message);
    }
  }

  async function cancelGymRequest(request) {
    setGymRequestError("");
    try {
      await onCancelGymRequest(request._id);
    } catch (error) {
      setGymRequestError(error.message);
    }
  }

  function openConfirmTransfer(request) {
    const validation = validateGymRequest(request);
    if (validation) {
      setGymRequestError(validation);
      return;
    }
    setConfirm({
      title: "Confirmar traslado",
      message: `Se descontará stock central y se asignará a ${request.gym?.name || "el gimnasio"} para la solicitud ${request.requestNumber}.`,
      confirmLabel: "Confirmar",
      danger: false,
      onConfirm: async () => {
        await confirmGymRequest(request);
        setConfirm(null);
      },
    });
  }

  function openCancelRequest(request) {
    setConfirm({
      title: "Cancelar solicitud",
      message: `La solicitud ${request.requestNumber} quedará cancelada y el gimnasio verá el cambio en su panel.`,
      confirmLabel: "Cancelar solicitud",
      onConfirm: async () => {
        await cancelGymRequest(request);
        setConfirm(null);
      },
    });
  }

  function confirmRemoveLine(index, item) {
    const product = selectedProduct(item.productId);
    setConfirm({
      title: "Eliminar producto",
      message: `Se quitará "${product?.name || "este producto"}" de la guía de reabastecimiento actual.`,
      confirmLabel: "Eliminar",
      onConfirm: () => {
        setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
        setConfirm(null);
      },
    });
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Compras a proveedor</span>
          <h1>Guía PDF de reabastecimiento</h1>
        </div>
        <button className="primaryButton compact" onClick={() => onDownload(items)}>
          <FileDown size={18} />
          Descargar PDF
        </button>
      </div>

      <div className="restockWorkspace">
        <section className="editorPanel">
          <div className="editorTitle">
            <div>
              <span>Selecciona productos</span>
              <h2>Pedido sugerido</h2>
            </div>
            <strong>{money(total)}</strong>
          </div>

          <label className="fieldRow">
            <span>Proveedor</span>
            <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
              <option value="all">Todos los proveedores</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <small className="formHint">Filtra productos para preparar la guía con un proveedor específico.</small>
          </label>

          <div className="restockGuideList">
            {items.map((item, index) => {
              const product = selectedProduct(item.productId);
              const variant = product?.variants.find((entry) => entry.sku === item.sku);
              return (
                <div className="restockGuideRow" key={index}>
                  <label>
                    <span>Producto</span>
                    <select value={item.productId} onChange={(event) => updateItem(index, { productId: event.target.value, sku: "" })}>
                      <option value="">Seleccionar</option>
                      {filteredProducts.map((productItem) => (
                        <option key={productItem._id} value={productItem._id}>
                          {productItem.name}
                        </option>
                      ))}
                    </select>
                    <small className="formHint">Producto que se solicitará al proveedor.</small>
                  </label>
                  <label>
                    <span>Variante</span>
                    <select
                      value={item.sku}
                      onChange={(event) => {
                        const nextVariant = product?.variants.find((entry) => entry.sku === event.target.value);
                        updateItem(index, { sku: event.target.value, unitCost: nextVariant?.cost || 0 });
                      }}
                    >
                      <option value="">Seleccionar</option>
                      {(product?.variants || []).map((variantItem) => (
                        <option key={variantItem.sku} value={variantItem.sku}>
                          {variantItem.label} · Stock: {variantItem.stock} pz
                        </option>
                      ))}
                    </select>
                    <small className="formHint">Presentación o talla que necesitas reabastecer.</small>
                  </label>
                  <label>
                    <span>Piezas</span>
                    <input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} placeholder="12" />
                    <small className="formHint">Cantidad a pedir.</small>
                  </label>
                  <label>
                    <span>Costo unitario</span>
                    <input type="number" min="0" step="0.01" value={item.unitCost} onChange={(event) => updateItem(index, { unitCost: event.target.value })} placeholder="520.00" />
                    <small className="formHint">Costo estimado por pieza.</small>
                  </label>
                  <div>
                    <span>Total</span>
                    <strong>{money(Number(item.quantity || 0) * Number(item.unitCost || variant?.cost || 0))}</strong>
                  </div>
                  <button
                    className="dangerIcon"
                    onClick={() => confirmRemoveLine(index, item)}
                    disabled={items.length === 1}
                    aria-label="Eliminar producto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          <button className="ghostButton" onClick={() => setItems((current) => [...current, emptyLine])}>
            <Plus size={16} />
            Agregar producto
          </button>
        </section>

        <section className="panel restockHistoryPanel">
          <div className="editorTitle">
            <div>
              <span>Historial</span>
              <h2>Solicitudes de reabastecimiento</h2>
            </div>
            <strong>{filteredGuides.length}</strong>
          </div>
          <div className="restockHistoryTools">
            <label className="searchField">
              <Search size={17} />
              <input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Buscar guía, producto o SKU" />
            </label>
            <select value={historySupplier} onChange={(event) => setHistorySupplier(event.target.value)}>
              <option value="all">Todos los proveedores</option>
              {historySuppliers.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))}
            </select>
          </div>
          <div className="restockHistoryList">
            {guidesPager.pagedItems.map((guide) => (
              <article className="restockHistoryItem" key={guide._id}>
                <div>
                  <strong>{guide.guideNumber}</strong>
                  <span>{formatDate(guide.createdAt)} · {guideSuppliers(guide).join(", ") || "Sin proveedor"}</span>
                </div>
                <div className="restockHistorySummary">
                  <span>{guide.totalItems || 0} pz</span>
                  <strong>{money(guide.totalCost)}</strong>
                </div>
                <button className="ghostButton" onClick={() => onDownloadHistory(guide)}>
                  <FileDown size={16} />
                  PDF
                </button>
              </article>
            ))}
            {filteredGuides.length === 0 && <div className="emptyState">No hay guías que coincidan con la búsqueda.</div>}
          </div>
          <PaginationControls {...guidesPager} />
        </section>
      </div>

      <section className="panel gymRestockAdminPanel">
        <div className="editorTitle">
          <div>
            <span>Gimnasios</span>
            <h2>Solicitudes de stock local</h2>
          </div>
          <strong>{gymRequests.length}</strong>
        </div>
        <div className="gymRequestAdminGrid">
          {gymRequestError && <p className="errorText">{gymRequestError}</p>}
          {gymRequestsPager.pagedItems.map((request) => (
            <article className="gymRequestAdminCard" key={request._id}>
              <div className="gymRequestAdminTop">
                <div>
                  <span className="pill">{gymRequestLabels[request.status] || request.status}</span>
                  <h3>{request.requestNumber}</h3>
                  <p>{request.gym?.name || "Gimnasio"} · {new Date(request.createdAt).toLocaleDateString("es-MX")}</p>
                </div>
                <Truck size={20} />
              </div>
              <div className="gymRequestItems">
                {request.items.map((item) => (
                  <div key={`${request._id}-${item.sku}`}>
                    <span>{item.productName}</span>
                    <strong>{item.quantity} pz</strong>
                    <small>{item.variantLabel} · {item.sku} · actual {item.currentStock}/10</small>
                  </div>
                ))}
              </div>
              {request.note && <p className="formHint">{request.note}</p>}
              {request.status === "requested" && (
                <div className="entityActions">
                  <button className="ghostButton" type="button" onClick={() => openConfirmTransfer(request)}>
                    <CheckCircle2 size={16} />
                    Confirmar traslado
                  </button>
                  <button className="dangerButtonInline" type="button" onClick={() => openCancelRequest(request)}>
                    <XCircle size={16} />
                    Cancelar
                  </button>
                </div>
              )}
            </article>
          ))}
          {gymRequests.length === 0 && <div className="emptyState">No hay solicitudes de gimnasios.</div>}
        </div>
        <PaginationControls {...gymRequestsPager} />
        <div className="gymStockSnapshot">
          <strong>Stock local activo</strong>
          <span>{gymStock.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} pieza(s) distribuidas en gimnasios</span>
        </div>
      </section>
      <ConfirmDialog open={Boolean(confirm)} {...(confirm || {})} onCancel={() => setConfirm(null)} />
    </section>
  );
}
