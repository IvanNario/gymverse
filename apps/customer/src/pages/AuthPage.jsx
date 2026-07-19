import { Eye, EyeOff, KeyRound, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { api, setToken } from "../services/api.js";
import { validateAuthForm } from "../utils/forms.js";

const viteGoogleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [resetForm, setResetForm] = useState({ email: "", code: "", newPassword: "", confirmPassword: "" });
  const [resetStep, setResetStep] = useState("request");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(viteGoogleClientId);
  const [isGoogleConfigLoading, setIsGoogleConfigLoading] = useState(!viteGoogleClientId);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (viteGoogleClientId) return undefined;
    let cancelled = false;
    api("/auth/google-config")
      .then((data) => {
        if (!cancelled && data.enabled && data.clientId) setGoogleClientId(data.clientId);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar la configuración de Google Login.");
      })
      .finally(() => {
        if (!cancelled) setIsGoogleConfigLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!googleClientId) return undefined;
    let cancelled = false;

    function renderGoogleButton() {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
        ux_mode: "popup",
        auto_select: false,
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: mode === "login" ? "signin_with" : "signup_with",
        width: Math.min(360, googleButtonRef.current.clientWidth || 320),
      });
      setIsGoogleReady(true);
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      renderGoogleButton();
      existingScript.addEventListener("load", renderGoogleButton, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;
      script.onerror = () => {
        if (!cancelled) setError("No se pudo cargar Google Login. Intenta de nuevo.");
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [googleClientId, mode]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setInfo("");
    const validation = validateAuthForm(mode, form);
    if (validation) {
      setError(validation);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, phone: form.phone, password: form.password };
      const data = await api(`/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", body: payload });
      setToken(data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message.includes("Credenciales") ? "Correo o contraseña incorrectos. Revisa tus datos e intenta de nuevo." : err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestResetCode(event) {
    event.preventDefault();
    setError("");
    setInfo("");
    setIsSubmitting(true);
    try {
      const data = await api("/auth/password-reset/request", { method: "POST", body: { email: resetForm.email } });
      setResetStep("confirm");
      setInfo(data.devCode ? `Código de prueba: ${data.devCode}` : data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmResetCode(event) {
    event.preventDefault();
    setError("");
    setInfo("");
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await api("/auth/password-reset/confirm", {
        method: "POST",
        body: { email: resetForm.email, code: resetForm.code, newPassword: resetForm.newPassword },
      });
      setToken(data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setInfo("");
    setShowPassword(false);
  }

  async function handleGoogleCredential(response) {
    setError("");
    const credential = String(response?.credential || "");
    if (!credential || credential.length > 4096) {
      setError("No se pudo validar Google Login");
      return;
    }
    setIsGoogleSubmitting(true);
    try {
      const data = await api("/auth/google", { method: "POST", body: { credential } });
      setToken(data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <main className="authScreen">
      <section className="authPanel">
        <div className="authBrand">
          <img src="/logo-yellow-bg.png" alt="GymVerse" />
          <div>
            <span>GymVerse</span>
            <h1>{mode === "recover" ? "Recupera tu acceso" : mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}</h1>
            <p>
              {mode === "recover"
                ? "Te enviaremos un código para crear una contraseña nueva."
                : mode === "login"
                  ? "Accede a tus pedidos, puntos y recompensas."
                  : "Compra, gana puntos y recoge en gimnasios afiliados."}
            </p>
          </div>
        </div>
        <div className="authSwitch" role="tablist" aria-label="Acceso">
          <button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")} type="button">
            Iniciar sesión
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")} type="button">
            Registro
          </button>
        </div>
        {mode !== "recover" && <div className="googleAuthBox">
          {isGoogleConfigLoading ? (
            <button className="googleFallbackButton" type="button" disabled>
              Preparando Google Login...
            </button>
          ) : googleClientId ? (
            <>
              <div ref={googleButtonRef} className={`googleButtonSlot ${isGoogleReady ? "" : "loading"}`} />
              {isGoogleSubmitting && <span>Validando Google...</span>}
            </>
          ) : (
            <button className="googleFallbackButton" type="button" disabled>
              Google Login no configurado
            </button>
          )}
        </div>}
        {mode !== "recover" && <div className="authDivider"><span>o usa tu correo</span></div>}
        {mode === "recover" ? (
          <form className="authCard" onSubmit={resetStep === "request" ? requestResetCode : confirmResetCode}>
            <label>
              <Mail size={18} />
              <input
                type="email"
                value={resetForm.email}
                onChange={(event) => setResetForm({ ...resetForm, email: event.target.value })}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                required
                readOnly={resetStep === "confirm"}
              />
            </label>
            {resetStep === "confirm" && (
              <>
                <label>
                  <KeyRound size={18} />
                  <input
                    value={resetForm.code}
                    onChange={(event) => setResetForm({ ...resetForm, code: event.target.value.replace(/\D/g, "").slice(0, 6) })}
                    placeholder="Código de 6 dígitos"
                    inputMode="numeric"
                    required
                  />
                </label>
                <label className="passwordField">
                  <LockKeyhole size={18} />
                  <input
                    type={showResetPassword ? "text" : "password"}
                    value={resetForm.newPassword}
                    onChange={(event) => setResetForm({ ...resetForm, newPassword: event.target.value })}
                    placeholder="Nueva contraseña"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button type="button" onClick={() => setShowResetPassword((current) => !current)} aria-label={showResetPassword ? "Ocultar contraseña" : "Ver contraseña"}>
                    {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </label>
                <label>
                  <LockKeyhole size={18} />
                  <input
                    type={showResetPassword ? "text" : "password"}
                    value={resetForm.confirmPassword}
                    onChange={(event) => setResetForm({ ...resetForm, confirmPassword: event.target.value })}
                    placeholder="Confirmar contraseña"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
              </>
            )}
            {info && <p className="successText">{info}</p>}
            {error && <p className="errorText">{error}</p>}
            <button className="primaryButton" disabled={isSubmitting}>
              {isSubmitting ? "Validando..." : resetStep === "request" ? "Enviar código" : "Cambiar contraseña"}
            </button>
            <button className="linkButton" type="button" onClick={() => switchMode("login")}>
              Volver al inicio de sesión
            </button>
          </form>
        ) : (
        <form className="authCard" onSubmit={submit}>
          {mode === "register" && (
            <>
              <label>
                <UserRound size={18} />
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Nombre completo"
              autoComplete="name"
              minLength={3}
              required
            />
          </label>
              <label>
                <Phone size={18} />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="Teléfono"
              autoComplete="tel"
              inputMode="tel"
            />
          </label>
            </>
          )}
          <label>
            <Mail size={18} />
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="passwordField">
            <LockKeyhole size={18} />
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Contraseña"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
            <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>
          {mode === "register" && (
            <label>
              <LockKeyhole size={18} />
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                placeholder="Confirmar contraseña"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          )}
          {error && <p className="errorText">{error}</p>}
          <button className="primaryButton" disabled={isSubmitting}>
            {isSubmitting ? "Validando..." : mode === "login" ? "Entrar" : "Registrarme"}
          </button>
          {mode === "login" && (
            <button className="linkButton" type="button" onClick={() => {
              setResetForm({ ...resetForm, email: form.email });
              setResetStep("request");
              switchMode("recover");
            }}>
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </form>
        )}
        <div className="authAssurance">
          <ShieldCheck size={16} />
          <span>Tus datos se protegen con controles de privacidad y pagos procesados por Mercado Pago.</span>
        </div>
      </section>
    </main>
  );
}
