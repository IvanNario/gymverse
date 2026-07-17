import React, { useState } from "react";
import { Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";

const emptySupplier = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  status: "active",
};

const statusLabels = {
  active: "Activo",
  paused: "Pausado",
};

export function SuppliersPage({ suppliers, onSave, onDelete }) {
  const [tab, setTab] = useState("list");
  const [form, setForm] = useState(emptySupplier);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirm, setConfirm] = useState(null);

  const filteredSuppliers = suppliers.filter((supplier) => {
    const normalized = query.trim().toLowerCase();
    const matchesQuery =
      !normalized ||
      [supplier.name, supplier.contactName, supplier.email, supplier.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  const suppliersPager = usePagedItems(filteredSuppliers);

  function startNewSupplier() {
    setForm(emptySupplier);
    setTab("form");
  }

  function startEditSupplier(supplier) {
    setForm(supplier);
    setTab("form");
  }

  function closeForm() {
    setForm(emptySupplier);
    setTab("list");
  }

  async function submit(event) {
    event.preventDefault();
    await onSave(form);
    closeForm();
  }

  function confirmDeleteSupplier(supplier) {
    setConfirm({
      title: "Eliminar proveedor",
      message: `Se eliminará "${supplier.name}" del administrador. Revisa si tiene productos o guías de reabastecimiento relacionadas.`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        await onDelete(supplier._id);
        setConfirm(null);
      },
    });
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Compras</span>
          <h1>Proveedores</h1>
        </div>
      </div>

      <div className="pageTabs" role="tablist" aria-label="Proveedores">
        <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")} type="button">
          {tab === "form" ? "Volver a proveedores" : "Proveedores"}
        </button>
        <button className="primaryButton compact" onClick={startNewSupplier} type="button">
          <Plus size={17} />
          Nuevo proveedor
        </button>
      </div>

      {tab === "form" ? (
        <form className="editorPanel" onSubmit={submit}>
          <div className="editorTitle">
            <div>
              <span>{form._id ? "Editando" : "Nuevo proveedor"}</span>
              <h2>{form._id ? form.name : "Agregar proveedor"}</h2>
            </div>
            {form._id && (
              <button type="button" className="ghostIcon" onClick={closeForm} aria-label="Cancelar">
                <X size={18} />
              </button>
            )}
          </div>
          <div className="formGrid">
            <label><span>Nombre</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. NutriMax" required /><small className="formHint">Nombre comercial del proveedor.</small></label>
            <label><span>Contacto</span><input value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} placeholder="Nombre del ejecutivo" /><small className="formHint">Persona principal para pedidos o cotizaciones.</small></label>
            <label><span>Correo</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="compras@proveedor.mx" /><small className="formHint">Correo donde se enviarán guías o solicitudes.</small></label>
            <label><span>Teléfono</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="55 0000 0000" /><small className="formHint">Número de contacto administrativo.</small></label>
            <label>
              <span>Estado</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
              </select>
              <small className="formHint">Pausado oculta al proveedor de operación diaria.</small>
            </label>
          </div>
          <button className="primaryButton"><Save size={18} />Guardar proveedor</button>
        </form>
      ) : (
        <>
          <section className="filterPanel">
            <label className="searchField">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proveedor, contacto, correo o teléfono" />
            </label>
            <label>
              <span>Estado</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="paused">Pausados</option>
              </select>
            </label>
          </section>
          <div className="resultMeta">{filteredSuppliers.length} proveedor(es) encontrados</div>
          <div className="cardGrid fluid">
          {suppliersPager.pagedItems.map((supplier) => (
            <article className="entityCard" key={supplier._id}>
              <span className="pill">{statusLabels[supplier.status] || supplier.status}</span>
              <h2>{supplier.name}</h2>
              <p>{supplier.contactName || "Sin contacto principal"}</p>
              <div>
                <strong>{supplier.email || "Sin correo"}</strong>
                <span>{supplier.phone || "Sin teléfono"}</span>
              </div>
              <div className="entityActions">
                <button className="ghostButton" onClick={() => startEditSupplier(supplier)}><Pencil size={16} />Editar</button>
                <button className="dangerButtonInline" onClick={() => confirmDeleteSupplier(supplier)}><Trash2 size={16} />Eliminar</button>
              </div>
            </article>
          ))}
          {filteredSuppliers.length === 0 && <div className="emptyState">No hay proveedores que coincidan con la búsqueda.</div>}
        </div>
        <PaginationControls {...suppliersPager} />
        </>
      )}
      <ConfirmDialog open={Boolean(confirm)} {...(confirm || {})} onCancel={() => setConfirm(null)} />
    </section>
  );
}
