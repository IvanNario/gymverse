import React, { useState } from "react";
import { CreditCard, KeyRound, Pencil, Plus, Save, ShieldOff, Trash2, UserCheck, X } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { passwordValidationMessage } from "../utils/forms.js";

const emptyGym = {
  name: "",
  code: "",
  address: "",
  city: "",
  phone: "",
  capacity: "medium",
  status: "active",
  pickupEnabled: true,
  membershipFee: 0,
  paymentStatus: "pending",
};

const capacityLabels = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};
const statusLabels = {
  active: "Activo",
  paused: "Pausado",
};
const paymentLabels = {
  pending: "Pendiente",
  paid: "Pagado",
  overdue: "Vencido",
};

const emptyAccess = {
  name: "",
  email: "",
  password: "",
};

export function GymsPage({ gyms, onSave, onDelete, onMarkPayment, onSaveAccess, onAccessStatus }) {
  const [tab, setTab] = useState("list");
  const [form, setForm] = useState(emptyGym);
  const [accessForms, setAccessForms] = useState({});
  const [accessErrors, setAccessErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const gymsPager = usePagedItems(gyms);

  function startNewGym() {
    setForm(emptyGym);
    setTab("form");
  }

  function startEditGym(gym) {
    setForm(gym);
    setTab("form");
  }

  function closeForm() {
    setForm(emptyGym);
    setTab("list");
  }

  async function submit(event) {
    event.preventDefault();
    await onSave(form);
    closeForm();
  }

  function accessFormFor(gym) {
    return accessForms[gym._id] || {
      name: gym.accessUser?.name || `${gym.name} Recepción`,
      email: gym.accessUser?.email || "",
      password: "",
    };
  }

  function updateAccessForm(gym, patch) {
    setAccessForms((current) => ({ ...current, [gym._id]: { ...accessFormFor(gym), ...patch } }));
  }

  async function submitAccess(event, gym) {
    event.preventDefault();
    const payload = accessFormFor(gym);
    const validation = passwordValidationMessage(payload.password, { optional: Boolean(gym.accessUser) });
    if (validation) {
      setAccessErrors((current) => ({ ...current, [gym._id]: validation }));
      return;
    }
    setAccessErrors((current) => ({ ...current, [gym._id]: "" }));
    await onSaveAccess(gym._id, payload);
    setAccessForms((current) => ({ ...current, [gym._id]: { ...payload, password: "" } }));
  }

  function confirmDeleteGym(gym) {
    setConfirm({
      title: "Eliminar gimnasio",
      message: `Se eliminará "${gym.name}" como gimnasio afiliado. Valida que no tenga pedidos o stock local pendiente antes de continuar.`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        await onDelete(gym._id);
        setConfirm(null);
      },
    });
  }

  function confirmAccessStatus(gym) {
    const nextStatus = gym.accessUser.status === "disabled" ? "active" : "disabled";
    setConfirm({
      title: nextStatus === "active" ? "Reactivar acceso" : "Desactivar acceso",
      message:
        nextStatus === "active"
          ? `La cuenta de "${gym.name}" podrá volver a entrar al panel del gimnasio.`
          : `La cuenta de "${gym.name}" ya no podrá entrar al panel hasta que la reactives.`,
      confirmLabel: nextStatus === "active" ? "Reactivar" : "Desactivar",
      danger: nextStatus !== "active",
      onConfirm: async () => {
        await onAccessStatus(gym._id, nextStatus);
        setConfirm(null);
      },
    });
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Afiliados</span>
          <h1>Gimnasios</h1>
        </div>
      </div>

      <div className="pageTabs" role="tablist" aria-label="Gimnasios">
        <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")} type="button">
          {tab === "form" ? "Volver a gimnasios" : "Gimnasios"}
        </button>
        <button className="primaryButton compact" onClick={startNewGym} type="button">
          <Plus size={17} />
          Nuevo gimnasio
        </button>
      </div>

      {tab === "form" ? (
        <form className="editorPanel" onSubmit={submit}>
          <div className="editorTitle">
            <div>
              <span>{form._id ? "Editando" : "Nuevo afiliado"}</span>
              <h2>{form._id ? form.name : "Registrar gimnasio"}</h2>
            </div>
            {form._id && (
              <button type="button" className="ghostIcon" onClick={closeForm} aria-label="Cancelar">
                <X size={18} />
              </button>
            )}
          </div>
          <div className="formGrid">
            <label><span>Nombre</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. GymVerse Centro" required /><small className="formHint">Nombre público del gimnasio afiliado.</small></label>
            <label><span>Código</span><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="GVC" required /><small className="formHint">Clave corta para identificar la sede.</small></label>
            <label><span>Ciudad</span><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Ciudad de México" required /><small className="formHint">Ciudad donde opera la sede.</small></label>
            <label><span>Teléfono</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="55 0000 0000" /><small className="formHint">Contacto del gimnasio para entregas.</small></label>
            <label>
              <span>Capacidad</span>
              <select value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })}>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
              <small className="formHint">Capacidad operativa para recibir pedidos.</small>
            </label>
            <label>
              <span>Estado</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
              </select>
              <small className="formHint">Pausado mantiene el registro sin operar retiros.</small>
            </label>
            <label>
              <span>Cuota de afiliación</span>
              <input type="number" min="0" value={form.membershipFee || 0} onChange={(event) => setForm({ ...form, membershipFee: event.target.value })} placeholder="2500.00" />
              <small className="formHint">Monto mensual que debe cubrir el gimnasio.</small>
            </label>
            <label>
              <span>Pago afiliado</span>
              <select value={form.paymentStatus || "pending"} onChange={(event) => setForm({ ...form, paymentStatus: event.target.value })}>
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="overdue">Vencido</option>
              </select>
              <small className="formHint">Estado actual del pago mensual.</small>
            </label>
          </div>
          <label><span>Dirección</span><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Calle, número, colonia" required /><small className="formHint">Dirección visible como punto de retiro.</small></label>
          <label className="checkRow">
            <input type="checkbox" checked={form.pickupEnabled} onChange={(event) => setForm({ ...form, pickupEnabled: event.target.checked })} />
            <span>Permitir retiro de compras en este gimnasio</span>
          </label>
          <button className="primaryButton"><Save size={18} />Guardar gimnasio</button>
        </form>
      ) : (
        <>
        <div className="cardGrid fluid">
          {gymsPager.pagedItems.map((gym) => (
            <article className="entityCard" key={gym._id}>
              <span className="pill">{statusLabels[gym.status] || gym.status}</span>
              <h2>{gym.name}</h2>
              <p>{gym.address}</p>
              <div>
                <strong>{gym.code}</strong>
                <span>{capacityLabels[gym.capacity] || gym.capacity} · Pago: {paymentLabels[gym.paymentStatus] || "Pendiente"}</span>
              </div>
              {gym.lastPaymentAt && <p>Último pago: {new Date(gym.lastPaymentAt).toLocaleDateString("es-MX")}</p>}
              {gym.nextPaymentDue && <p>Próximo pago: {new Date(gym.nextPaymentDue).toLocaleDateString("es-MX")}</p>}
              <section className="gymAccessPanel">
                <div className="gymAccessHead">
                  <div>
                    <span>Acceso del gimnasio</span>
                    <strong>{gym.accessUser ? gym.accessUser.email : "Sin cuenta creada"}</strong>
                  </div>
                  {gym.accessUser && (
                    <span className={`accessStatus ${gym.accessUser.status === "disabled" ? "disabled" : ""}`}>
                      {gym.accessUser.status === "disabled" ? "Desactivado" : "Activo"}
                    </span>
                  )}
                </div>
                <form className="gymAccessForm" onSubmit={(event) => submitAccess(event, gym)}>
                  <label>
                    <span>Responsable</span>
                    <input value={accessFormFor(gym).name} onChange={(event) => updateAccessForm(gym, { name: event.target.value })} required />
                  </label>
                  <label>
                    <span>Correo de acceso</span>
                    <input
                      type="email"
                      value={accessFormFor(gym).email}
                      onChange={(event) => updateAccessForm(gym, { email: event.target.value })}
                      placeholder="recepcion@gimnasio.mx"
                      required
                    />
                  </label>
                  <label>
                    <span>{gym.accessUser ? "Nueva contraseña" : "Contraseña temporal"}</span>
                    <input
                      type="password"
                      value={accessFormFor(gym).password}
                      onChange={(event) => updateAccessForm(gym, { password: event.target.value })}
                      placeholder={gym.accessUser ? "Opcional" : "Requerida"}
                      required={!gym.accessUser}
                      minLength={gym.accessUser ? undefined : 8}
                    />
                    <small className="formHint">Mínimo 8 caracteres con letras y números.</small>
                  </label>
                  {accessErrors[gym._id] && <p className="errorText">{accessErrors[gym._id]}</p>}
                  <button className="ghostButton">
                    {gym.accessUser ? <KeyRound size={16} /> : <UserCheck size={16} />}
                    {gym.accessUser ? "Actualizar acceso" : "Crear acceso"}
                  </button>
                </form>
                {gym.accessUser && (
                  <button
                    className={gym.accessUser.status === "disabled" ? "ghostButton" : "dangerButtonInline"}
                    onClick={() => confirmAccessStatus(gym)}
                  >
                    {gym.accessUser.status === "disabled" ? <UserCheck size={16} /> : <ShieldOff size={16} />}
                    {gym.accessUser.status === "disabled" ? "Reactivar acceso" : "Desactivar acceso"}
                  </button>
                )}
              </section>
              <div className="entityActions">
                <button className="ghostButton" onClick={() => onMarkPayment(gym._id)}><CreditCard size={16} />Marcar pago</button>
                <button className="ghostButton" onClick={() => startEditGym(gym)}><Pencil size={16} />Editar</button>
                <button className="dangerButtonInline" onClick={() => confirmDeleteGym(gym)}><Trash2 size={16} />Eliminar</button>
              </div>
            </article>
          ))}
        </div>
        <PaginationControls {...gymsPager} />
        </>
      )}
      <ConfirmDialog open={Boolean(confirm)} {...(confirm || {})} onCancel={() => setConfirm(null)} />
    </section>
  );
}
