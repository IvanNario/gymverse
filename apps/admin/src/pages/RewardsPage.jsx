import React, { useState } from "react";
import { FileDown, Gift, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";

const emptyDrop = {
  title: "Drop semanal",
  subtitle: "",
  bannerText: "",
  imageUrl: "",
  status: "draft",
  items: [{ product: "", sku: "", pointsCost: 100, stock: 1, active: true }],
};

const rewardStatuses = ["requested", "preparing", "ready_for_pickup", "in_transit", "delivered", "cancelled"];
const dropStatusLabels = {
  draft: "Borrador",
  active: "Activo",
  archived: "Archivado",
};
const rewardStatusLabels = {
  requested: "Solicitado",
  preparing: "Preparando",
  ready_for_pickup: "Listo para recoger",
  in_transit: "En tránsito",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

function toForm(drop) {
  if (!drop) return emptyDrop;
  return {
    _id: drop._id,
    title: drop.title || "",
    subtitle: drop.subtitle || "",
    bannerText: drop.bannerText || "",
    imageUrl: drop.imageUrl || "",
    status: drop.status || "draft",
    items: drop.items?.length
      ? drop.items.map((item) => ({
          product: item.product?._id || item.product || "",
          sku: item.sku || "",
          pointsCost: item.pointsCost || 0,
          stock: item.stock || 0,
          active: item.active !== false,
        }))
      : emptyDrop.items,
  };
}

export function RewardsPage({ drops, rewardOrders, products, onSaveDrop, onRewardStatus, onDownloadRewardGuide }) {
  const [form, setForm] = useState(emptyDrop);
  const [confirm, setConfirm] = useState(null);
  const dropsPager = usePagedItems(drops);
  const rewardOrdersPager = usePagedItems(rewardOrders);

  function updateItem(index, patch) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  function productById(id) {
    return products.find((product) => product._id === id);
  }

  async function submit(event) {
    event.preventDefault();
    await onSaveDrop(form);
    setForm(emptyDrop);
  }

  function confirmRemoveDropItem(index, item) {
    const product = productById(item.product);
    setConfirm({
      title: "Eliminar producto del drop",
      message: `Se quitará "${product?.name || "este producto"}" del drop actual. El cambio se aplicará cuando guardes el drop.`,
      confirmLabel: "Eliminar",
      onConfirm: () => {
        setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
        setConfirm(null);
      },
    });
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Puntos y canjes</span>
          <h1>Recompensas</h1>
        </div>
      </div>

      <div className="twoColumns rewardLayout">
        <form className="editorPanel" onSubmit={submit}>
          <div className="editorTitle">
            <div>
              <span>{form._id ? "Editando drop" : "Nuevo drop"}</span>
              <h2>Drop semanal</h2>
            </div>
            <Gift size={22} />
          </div>

          <div className="formGrid">
            <label><span>Título</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Drop semanal" required /><small className="formHint">Nombre que verá el cliente en el banner.</small></label>
            <label>
              <span>Estado</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="draft">{dropStatusLabels.draft}</option>
                <option value="active">{dropStatusLabels.active}</option>
              </select>
              <small className="formHint">Solo un drop activo se muestra en la app.</small>
            </label>
          </div>
          <label><span>Subtítulo</span><input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} placeholder="Canjea tus puntos por productos seleccionados" /><small className="formHint">Texto breve que acompaña el banner.</small></label>
          <label><span>Texto del banner</span><input value={form.bannerText} onChange={(event) => setForm({ ...form, bannerText: event.target.value })} placeholder="Nuevo drop" /><small className="formHint">Etiqueta corta superior del banner.</small></label>
          <label><span>Imagen URL</span><input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://..." /><small className="formHint">Imagen opcional para campañas o drops especiales.</small></label>

          <div className="variantEditor">
            <div className="editorTitle small">
              <h3>Productos canjeables</h3>
              <button
                type="button"
                className="ghostButton"
                onClick={() => setForm({ ...form, items: [...form.items, { product: "", sku: "", pointsCost: 100, stock: 1, active: true }] })}
              >
                <Plus size={16} />
                Producto
              </button>
            </div>
            {form.items.map((item, index) => {
              const product = productById(item.product);
              return (
                <div className="rewardItemRow" key={index}>
                  <select value={item.product} onChange={(event) => updateItem(index, { product: event.target.value, sku: "" })} required>
                    <option value="">Producto</option>
                    {products.map((productItem) => (
                      <option key={productItem._id} value={productItem._id}>{productItem.name}</option>
                    ))}
                  </select>
                  <select value={item.sku} onChange={(event) => updateItem(index, { sku: event.target.value })} required>
                    <option value="">Variante</option>
                    {(product?.variants || []).map((variant) => (
                      <option key={variant.sku} value={variant.sku}>{variant.label}</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={item.pointsCost} onChange={(event) => updateItem(index, { pointsCost: event.target.value })} placeholder="Puntos" />
                  <input type="number" min="0" value={item.stock} onChange={(event) => updateItem(index, { stock: event.target.value })} placeholder="Stock drop" />
                  <label className="checkRow inline">
                    <input type="checkbox" checked={item.active} onChange={(event) => updateItem(index, { active: event.target.checked })} />
                    <span>Activo</span>
                  </label>
                  <button
                    type="button"
                    className="dangerIcon"
                    onClick={() => confirmRemoveDropItem(index, item)}
                    disabled={form.items.length === 1}
                    aria-label="Eliminar producto del drop"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          <button className="primaryButton">
            <Save size={18} />
            Guardar drop
          </button>
        </form>

        <section className="panel">
          <h2>Drops guardados</h2>
          {dropsPager.pagedItems.map((drop) => (
            <div className="listRow" key={drop._id}>
              <div>
                <strong>{drop.title}</strong>
                <span>{dropStatusLabels[drop.status] || drop.status} · {drop.items?.length || 0} productos</span>
              </div>
              <button className="ghostIcon" onClick={() => setForm(toForm(drop))} aria-label="Editar drop">
                <Pencil size={16} />
              </button>
            </div>
          ))}
          <PaginationControls {...dropsPager} />
        </section>
      </div>

      <section className="panel">
        <h2>Pedidos de recompensa</h2>
        <div className="table">
          <div className="tableHead rewardOrders">
            <span>Pedido</span>
            <span>Cliente</span>
            <span>Productos</span>
            <span>Puntos</span>
            <span>Estado</span>
            <span>Guía</span>
          </div>
          {rewardOrdersPager.pagedItems.map((order) => (
            <div className="tableRow rewardOrders" key={order._id}>
              <strong>{order.rewardNumber}</strong>
              <span>{order.customer?.name}</span>
              <span>{order.items.map((item) => `${item.quantity}x ${item.productName}`).join(", ")}</span>
              <span>{order.totalPoints} pts</span>
              <select value={order.status} onChange={(event) => onRewardStatus(order._id, event.target.value)}>
                {rewardStatuses.map((status) => (
                  <option key={status} value={status}>{rewardStatusLabels[status]}</option>
                ))}
              </select>
              <button className="ghostButton" onClick={() => onDownloadRewardGuide(order)}>
                <FileDown size={16} />
                PDF
              </button>
            </div>
          ))}
        </div>
        <PaginationControls {...rewardOrdersPager} />
      </section>
      <ConfirmDialog open={Boolean(confirm)} {...(confirm || {})} onCancel={() => setConfirm(null)} />
    </section>
  );
}
