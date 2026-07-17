import { Edit3, ShieldCheck, UserPlus, UserX } from "lucide-react";
import React, { useMemo, useState } from "react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { PERMISSION_LABELS, ROLE_PRESETS, presetByKey } from "../permissions.js";
import { passwordValidationMessage } from "../utils/forms.js";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  adminRolePreset: ROLE_PRESETS[0].key,
  status: "active",
};

export function AdminUsersPage({ users = [], rolePresets = ROLE_PRESETS, onSave, onToggle }) {
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const selectedPreset = useMemo(() => presetByKey(form.adminRolePreset), [form.adminRolePreset]);
  const usersPager = usePagedItems(users);

  function startNew() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
  }

  function startEdit(user) {
    setEditing(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      adminRolePreset: user.adminRolePreset || ROLE_PRESETS[0].key,
      status: user.status || "active",
    });
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    const validation = passwordValidationMessage(form.password, { optional: Boolean(editing) });
    if (validation) {
      setError(validation);
      return;
    }
    await onSave({ ...form, _id: editing?._id });
    startNew();
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Control interno</span>
          <h1>Usuarios y roles</h1>
        </div>
        <button className="primaryButton compact" onClick={startNew} type="button">
          <UserPlus size={16} />
          Nuevo usuario
        </button>
      </div>

      <div className="usersWorkspace">
        <form className="editorPanel roleEditor" onSubmit={submit}>
          <div className="editorTitle">
            <div>
              <span>{editing ? "Editar acceso" : "Nuevo acceso"}</span>
              <h2>{editing ? editing.name : "Crear usuario interno"}</h2>
            </div>
          </div>
          <div className="formGrid">
            <label>
              <span>Nombre</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              <span>Correo</span>
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </label>
            <label>
              <span>{editing ? "Nueva contraseña opcional" : "Contraseña temporal"}</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required={!editing}
                minLength={8}
              />
              <small className="formHint">Mínimo 8 caracteres con letras y números.</small>
            </label>
            <label>
              <span>Estado</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="active">Activo</option>
                <option value="disabled">Desactivado</option>
              </select>
            </label>
          </div>

          <label>
            <span>Grupo de funciones</span>
            <select value={form.adminRolePreset} onChange={(event) => setForm({ ...form, adminRolePreset: event.target.value })}>
              {rolePresets.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <section className="rolePreview">
            <strong>{selectedPreset.label}</strong>
            <p>{selectedPreset.description}</p>
            <div className="permissionChips">
              {selectedPreset.permissions.map((permission) => (
                <span key={permission}>{PERMISSION_LABELS[permission] || permission}</span>
              ))}
            </div>
          </section>

          {error && <p className="errorText">{error}</p>}
          <button className="primaryButton">{editing ? "Guardar cambios" : "Crear usuario"}</button>
        </form>

        <section className="panel usersListPanel">
          <div className="editorTitle">
            <div>
              <span>Equipo</span>
              <h2>Accesos del administrador</h2>
            </div>
          </div>
          <div className="userRoleGrid">
            {usersPager.pagedItems.map((user) => {
              const preset = presetByKey(user.adminRolePreset);
              const isAdmin = user.role === "admin";
              return (
                <article className="userRoleCard" key={user._id}>
                  <div className="userRoleTop">
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <span className={`pill ${user.status === "disabled" ? "mutedPill" : ""}`}>{user.status === "disabled" ? "Desactivado" : "Activo"}</span>
                  </div>
                  <div className="roleNameLine">
                    <ShieldCheck size={16} />
                    <span>{isAdmin ? "Admin total" : preset.label}</span>
                  </div>
                  <div className="permissionChips compact">
                    {(isAdmin ? ["Acceso completo"] : (user.permissions || []).map((permission) => PERMISSION_LABELS[permission] || permission)).map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                  {!isAdmin && (
                    <div className="entityActions">
                      <button className="ghostButton" onClick={() => startEdit(user)} type="button">
                        <Edit3 size={16} />
                        Editar
                      </button>
                      <button className="ghostButton" onClick={() => onToggle(user, user.status === "disabled" ? "active" : "disabled")} type="button">
                        <UserX size={16} />
                        {user.status === "disabled" ? "Reactivar" : "Desactivar"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <PaginationControls {...usersPager} />
        </section>
      </div>
    </section>
  );
}
