import React, { useEffect, useState } from "react";
import { CheckCircle2, Dumbbell, FileText, LifeBuoy, LockKeyhole, LogOut, MapPin, Plus, Save, Search, X } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { validateAddress, validatePasswordChange, validateProfile } from "../utils/forms.js";

const emptyAddress = {
  label: "Casa",
  street: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
};

export function ProfilePage({
  user,
  orderCount,
  onSave,
  onChangePassword,
  gyms = [],
  gymSearchResults = [],
  onSearchGyms,
  onAffiliateGym,
  onRemoveGym,
  initialTab = "summary",
  onTabChange,
  onLegal,
  onSupport,
  onLogout,
}) {
  const [tab, setTab] = useState(initialTab);
  const [gymQuery, setGymQuery] = useState("");
  const [gymSearchError, setGymSearchError] = useState("");
  const [isSearchingGyms, setIsSearchingGyms] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [profile, setProfile] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    addresses: user.addresses?.length ? user.addresses : [emptyAddress],
  });

  useEffect(() => {
    setProfile({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      addresses: user.addresses?.length ? user.addresses : [emptyAddress],
    });
  }, [user]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  function selectTab(nextTab) {
    setTab(nextTab);
    setFormError("");
    setPasswordError("");
    setSuccessMessage("");
    onTabChange?.(nextTab);
  }

  function updateAddress(patch) {
    setProfile((current) => ({
      ...current,
      addresses: [{ ...current.addresses[0], ...patch }],
    }));
  }

  async function saveCurrent(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    const validation = tab === "address" ? validateAddress(profile.addresses[0]) : validateProfile(profile);
    if (validation) {
      setFormError(validation);
      return;
    }
    setIsSaving(true);
    try {
      const payload =
        tab === "address"
          ? { addresses: [profile.addresses[0]] }
          : { name: profile.name, phone: profile.phone };
      await onSave(payload);
      setSuccessMessage(tab === "address" ? "Domicilio actualizado correctamente" : "Datos actualizados correctamente");
      window.setTimeout(() => selectTab("summary"), 900);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setPasswordError("");
    setSuccessMessage("");
    const validation = validatePasswordChange(passwordForm);
    if (validation) {
      setPasswordError(validation);
      return;
    }
    setIsSaving(true);
    try {
      await onChangePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccessMessage("Contraseña actualizada correctamente");
      window.setTimeout(() => selectTab("summary"), 1100);
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function searchGyms(event) {
    event.preventDefault();
    setGymSearchError("");
    setIsSearchingGyms(true);
    try {
      await onSearchGyms(gymQuery);
    } catch (error) {
      setGymSearchError(error.message);
    } finally {
      setIsSearchingGyms(false);
    }
  }

  function confirmRemoveGym(gym) {
    setConfirm({
      title: "Quitar gimnasio",
      message: `Se quitará "${gym.name}" de tus gimnasios afiliados. Ya no aparecerá como punto de retiro para nuevas compras.`,
      confirmLabel: "Quitar",
      onConfirm: async () => {
        await onRemoveGym(gym._id);
        setConfirm(null);
      },
    });
  }

  const affiliatedIds = new Set((gyms || []).map((gym) => gym._id));
  const gymsPager = usePagedItems(gyms);
  const gymSearchPager = usePagedItems(gymSearchResults);

  return (
    <section className="screen profileScreen">
      <div className="profileCard heroProfile">
        <img src="/logo-white-bg.png" alt="" />
        <div>
          <span>Cuenta activa</span>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="profileTabs" role="tablist" aria-label="Perfil">
        <button className={tab === "summary" ? "active" : ""} onClick={() => selectTab("summary")} type="button">
          Resumen
        </button>
        <button className={tab === "account" ? "active" : ""} onClick={() => selectTab("account")} type="button">
          Datos
        </button>
        <button className={tab === "address" ? "active" : ""} onClick={() => selectTab("address")} type="button">
          Domicilio
        </button>
        <button className={tab === "gyms" ? "active" : ""} onClick={() => selectTab("gyms")} type="button">
          Gimnasios
        </button>
        <button className={tab === "security" ? "active" : ""} onClick={() => selectTab("security")} type="button">
          Seguridad
        </button>
      </div>

      {tab === "summary" && (
        <>
          <div className="profileStats">
            <article>
              <strong>{orderCount}</strong>
              <span>Compras</span>
            </article>
            <article>
              <strong>{gyms.length}</strong>
              <span>Gimnasios</span>
            </article>
            <article>
              <strong>{user.points || 0}</strong>
              <span>Puntos</span>
            </article>
            <article>
              <strong>{user.favorites?.length || 0}</strong>
              <span>Favoritos</span>
            </article>
          </div>

          <button className="iconTextButton" onClick={onLogout}>
            <LogOut size={18} />
            Cerrar sesión
          </button>

          <button className="legalLinkCard" onClick={onLegal} type="button">
            <FileText size={18} />
            <span>
              <strong>Legal y privacidad</strong>
              <small>Términos, políticas, devoluciones y derechos reservados.</small>
            </span>
          </button>

          <button className="legalLinkCard" onClick={onSupport} type="button">
            <LifeBuoy size={18} />
            <span>
              <strong>Soporte al cliente</strong>
              <small>Tickets, pagos, pedidos, devoluciones y ayuda con gimnasios.</small>
            </span>
          </button>

          <footer className="profileLegalFoot">© {new Date().getFullYear()} GymVerse. Todos los derechos reservados.</footer>
        </>
      )}

      {tab === "account" && (
        <form className="profileForm" onSubmit={saveCurrent}>
          <h2>Datos de cuenta</h2>
          <label>
            <span>Nombre</span>
            <input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} minLength={3} maxLength={120} required />
          </label>
          <label>
            <span>Correo</span>
            <input type="email" value={profile.email} readOnly aria-readonly="true" />
            <small className="formHint">Este correo se usa para iniciar sesión y no se puede cambiar desde la app.</small>
          </label>
          <label>
            <span>Teléfono</span>
            <input
              type="tel"
              value={profile.phone}
              onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
              placeholder="Ej. 55 1234 5678"
              autoComplete="tel"
              inputMode="tel"
            />
          </label>
          {formError && <p className="errorText">{formError}</p>}
          {successMessage && <p className="successText">{successMessage}</p>}
          <button className="primaryButton" disabled={isSaving}>
            <Save size={18} />
            {isSaving ? "Guardando..." : "Guardar datos"}
          </button>
        </form>
      )}

      {tab === "address" && (
        <form className="profileForm" onSubmit={saveCurrent}>
          <h2>Dirección de domicilio</h2>
          <div className="formGrid customer">
            <label><span>Etiqueta</span><input value={profile.addresses[0]?.label || ""} onChange={(event) => updateAddress({ label: event.target.value })} required /></label>
            <label><span>Teléfono</span><input value={profile.addresses[0]?.phone || ""} onChange={(event) => updateAddress({ phone: event.target.value })} inputMode="tel" required /></label>
            <label className="wide"><span>Calle y número</span><input value={profile.addresses[0]?.street || ""} onChange={(event) => updateAddress({ street: event.target.value })} required /></label>
            <label><span>Ciudad</span><input value={profile.addresses[0]?.city || ""} onChange={(event) => updateAddress({ city: event.target.value })} required /></label>
            <label><span>Estado</span><input value={profile.addresses[0]?.state || ""} onChange={(event) => updateAddress({ state: event.target.value })} required /></label>
            <label><span>Código postal</span><input value={profile.addresses[0]?.zip || ""} onChange={(event) => updateAddress({ zip: event.target.value })} inputMode="numeric" required /></label>
          </div>
          {formError && <p className="errorText">{formError}</p>}
          {successMessage && <p className="successText">{successMessage}</p>}
          <button className="primaryButton" disabled={isSaving}>
            <Save size={18} />
            {isSaving ? "Guardando..." : "Guardar domicilio"}
          </button>
        </form>
      )}

      {tab === "security" && (
        <form className="profileForm" onSubmit={savePassword}>
          <h2>Seguridad de la cuenta</h2>
          <p className="formHint">Actualiza tu contraseña de acceso. Usa al menos 8 caracteres y evita reutilizar claves de otros servicios.</p>
          <label>
            <span>Contraseña actual</span>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            <span>Nueva contraseña</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            <span>Confirmar nueva contraseña</span>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          {passwordError && <p className="errorText">{passwordError}</p>}
          {successMessage && <p className="successText">{successMessage}</p>}
          <button className="primaryButton" disabled={isSaving}>
            <LockKeyhole size={18} />
            {isSaving ? "Actualizando..." : "Cambiar contraseña"}
          </button>
        </form>
      )}

      {tab === "gyms" && (
        <section className="profileForm gymAffiliationPanel">
          <h2>Gimnasios afiliados</h2>
          <p className="formHint">Busca tu gimnasio y asígnalo a tu cuenta. Al comprar, solo verás estos gimnasios como puntos de retiro.</p>

          <div className="affiliatedGymList">
            {gyms.length === 0 && <div className="emptyCard">Aún no tienes gimnasios afiliados.</div>}
            {gymsPager.pagedItems.map((gym) => (
              <article className="affiliatedGymCard" key={gym._id}>
                <div>
                  <strong>{gym.name}</strong>
                  <span>
                    <MapPin size={15} />
                    {gym.city || "Sin ciudad"} · {gym.code}
                  </span>
                  <small>{gym.address}</small>
                </div>
                <button
                  className="ghostRound dangerGhost"
                  type="button"
                  onClick={() => confirmRemoveGym(gym)}
                  aria-label={`Quitar ${gym.name}`}
                >
                  <X size={17} />
                </button>
              </article>
            ))}
          </div>
          <PaginationControls {...gymsPager} />

          <form className="gymSearchForm" onSubmit={searchGyms}>
            <label>
              <span>Buscar gimnasio</span>
              <div className="inputWithIcon">
                <Search size={17} />
                <input
                  value={gymQuery}
                  onChange={(event) => setGymQuery(event.target.value)}
                  placeholder="Nombre, ciudad o código"
                  minLength={2}
                />
              </div>
            </label>
            <button className="primaryButton" disabled={isSearchingGyms || gymQuery.trim().length < 2}>
              {isSearchingGyms ? <span className="buttonSpinner" /> : <Search size={18} />}
              Buscar
            </button>
          </form>

          {gymSearchError && <p className="errorText">{gymSearchError}</p>}
          <div className="gymSearchResults">
            {gymSearchPager.pagedItems.map((gym) => {
              const affiliated = affiliatedIds.has(gym._id);
              return (
                <article className="affiliatedGymCard" key={gym._id}>
                  <div>
                    <strong>{gym.name}</strong>
                    <span>
                      <Dumbbell size={15} />
                      {gym.city || "Sin ciudad"} · {gym.code}
                    </span>
                    <small>{gym.address}</small>
                  </div>
                  <button className={`iconTextButton compact ${affiliated ? "isAffiliated" : ""}`} type="button" onClick={() => onAffiliateGym(gym._id)} disabled={affiliated}>
                    {affiliated ? <CheckCircle2 size={17} /> : <Plus size={17} />}
                    {affiliated ? "Afiliado" : "Afiliar"}
                  </button>
                </article>
              );
            })}
          </div>
          <PaginationControls {...gymSearchPager} />
        </section>
      )}

      <ConfirmDialog open={Boolean(confirm)} {...(confirm || {})} onCancel={() => setConfirm(null)} />
    </section>
  );
}
