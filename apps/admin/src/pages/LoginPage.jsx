import { LockKeyhole, Mail } from "lucide-react";
import React, { useState } from "react";
import { api, setToken } from "../services/api.js";

export function LoginPage({ onAuth }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await api("/auth/login", { method: "POST", body: form });
      if (!["admin", "staff", "gym"].includes(data.user.role)) throw new Error("Esta cuenta no tiene permisos para el panel");
      setToken(data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="loginPage">
      <section className="loginPanel">
        <img src="/logo-yellow-bg.png" alt="GymVerse" />
        <h1>GymVerse Admin</h1>
        <form onSubmit={submit}>
          <label>
            <Mail size={18} />
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="correo administrador"
              autoComplete="username"
              required
            />
          </label>
          <label>
            <LockKeyhole size={18} />
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="contraseña"
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="errorText">{error}</p>}
          <button className="primaryButton">Entrar</button>
        </form>
      </section>
      <aside className="loginExamples" aria-label="Examples">
        <strong>Examples</strong>
        <span>Admin: admin@gymverse.mx</span>
        <span>Staff: staff@gymverse.mx</span>
        <span>Gimnasio: gym@gymverse.mx</span>
      </aside>
    </main>
  );
}
