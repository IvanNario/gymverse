import React, { useMemo, useState } from "react";
import { Pencil, Plus, Save, Search, ToggleLeft, ToggleRight, X } from "lucide-react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { money } from "../services/api.js";

const emptyCoupon = {
  code: "",
  title: "",
  description: "",
  type: "percentage",
  value: 10,
  minSubtotal: 0,
  maxDiscount: 0,
  usageLimit: 0,
  active: true,
  startsAt: "",
  endsAt: "",
};

const typeLabels = {
  percentage: "Porcentaje",
  fixed: "Monto fijo",
  free_shipping: "Envío gratis",
};

function inputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function couponValue(coupon) {
  if (coupon.type === "free_shipping") return "Envío gratis";
  if (coupon.type === "percentage") return `${coupon.value}%`;
  return money(coupon.value);
}

export function CouponsPage({ coupons, onSave, onToggle }) {
  const [tab, setTab] = useState("list");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyCoupon);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return coupons;
    return coupons.filter((coupon) =>
      [coupon.code, coupon.title, coupon.description, coupon.type].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [coupons, query]);
  const couponsPager = usePagedItems(filtered);

  function startNew() {
    setForm(emptyCoupon);
    setTab("form");
  }

  function startEdit(coupon) {
    setForm({
      ...coupon,
      startsAt: inputDate(coupon.startsAt),
      endsAt: inputDate(coupon.endsAt),
    });
    setTab("form");
  }

  async function submit(event) {
    event.preventDefault();
    await onSave(form);
    setForm(emptyCoupon);
    setTab("list");
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Marketing</span>
          <h1>Promociones</h1>
        </div>
      </div>

      <div className="pageTabs" role="tablist" aria-label="Promociones">
        <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")} type="button">
          {tab === "form" ? "Volver a promociones" : "Promociones"}
        </button>
        <button className="primaryButton compact" onClick={startNew} type="button">
          <Plus size={17} />
          Nueva promo
        </button>
      </div>

      {tab === "form" ? (
        <form className="editorPanel" onSubmit={submit}>
          <div className="editorTitle">
            <div>
              <span>{form._id ? "Editando" : "Nueva promoción"}</span>
              <h2>{form._id ? form.code : "Crear cupón"}</h2>
            </div>
            <button type="button" className="ghostIcon" onClick={() => setTab("list")} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
          <div className="formGrid">
            <label>
              <span>Código</span>
              <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} required />
            </label>
            <label>
              <span>Título visible</span>
              <input value={form.title || ""} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="10% en suplementos" />
            </label>
            <label>
              <span>Tipo</span>
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                <option value="percentage">Porcentaje</option>
                <option value="fixed">Monto fijo</option>
                <option value="free_shipping">Envío gratis</option>
              </select>
            </label>
            <label>
              <span>Valor</span>
              <input type="number" min="0" value={form.value || 0} onChange={(event) => setForm({ ...form, value: event.target.value })} />
            </label>
            <label>
              <span>Compra mínima</span>
              <input type="number" min="0" value={form.minSubtotal || 0} onChange={(event) => setForm({ ...form, minSubtotal: event.target.value })} />
            </label>
            <label>
              <span>Tope descuento</span>
              <input type="number" min="0" value={form.maxDiscount || 0} onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })} />
            </label>
            <label>
              <span>Límite de usos</span>
              <input type="number" min="0" value={form.usageLimit || 0} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} />
            </label>
            <label>
              <span>Estado</span>
              <select value={form.active ? "active" : "paused"} onChange={(event) => setForm({ ...form, active: event.target.value === "active" })}>
                <option value="active">Activa</option>
                <option value="paused">Pausada</option>
              </select>
            </label>
            <label>
              <span>Inicio</span>
              <input type="date" value={form.startsAt || ""} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
            </label>
            <label>
              <span>Fin</span>
              <input type="date" value={form.endsAt || ""} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
            </label>
          </div>
          <label>
            <span>Descripción</span>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
          </label>
          <button className="primaryButton">
            <Save size={18} />
            Guardar promoción
          </button>
        </form>
      ) : (
        <>
          <label className="searchField">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por código, título o descripción" />
          </label>
          <div className="promoGrid">
            {filtered.length === 0 && <div className="emptyState">No hay promociones para mostrar.</div>}
            {couponsPager.pagedItems.map((coupon) => (
              <article className="promoCard" key={coupon._id}>
                <div className="promoCardTop">
                  <span className={`pill ${coupon.active ? "" : "mutedPill"}`}>{coupon.active ? "Activa" : "Pausada"}</span>
                  <strong>{coupon.code}</strong>
                </div>
                <h2>{coupon.title || coupon.description}</h2>
                <p>{coupon.description}</p>
                <div className="promoStats">
                  <div><span>Tipo</span><strong>{typeLabels[coupon.type]}</strong></div>
                  <div><span>Valor</span><strong>{couponValue(coupon)}</strong></div>
                  <div><span>Usos</span><strong>{coupon.usedCount || 0}{coupon.usageLimit ? `/${coupon.usageLimit}` : ""}</strong></div>
                  <div><span>Mínimo</span><strong>{money(coupon.minSubtotal || 0)}</strong></div>
                </div>
                <div className="entityActions">
                  <button className="ghostButton" onClick={() => startEdit(coupon)}><Pencil size={16} />Editar</button>
                  <button className="ghostButton" onClick={() => onToggle(coupon._id, !coupon.active)}>
                    {coupon.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {coupon.active ? "Pausar" : "Activar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <PaginationControls {...couponsPager} />
        </>
      )}
    </section>
  );
}
