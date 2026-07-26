import { env } from "../config/env.js";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendPasswordResetEmail({ to, name, code }) {
  if (!env.resendApiKey) return { delivered: false, reason: "missing-provider" };

  const safeName = escapeHtml(name || "cliente");
  const safeCode = escapeHtml(code);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to,
      subject: "Código para recuperar tu cuenta GymVerse",
      text: [
        `Hola ${name || "cliente"},`,
        "",
        `Tu código para cambiar la contraseña es: ${code}`,
        "",
        "Este código vence en 15 minutos. Si no solicitaste este cambio, ignora este correo.",
        "",
        "GymVerse",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;color:#161616;line-height:1.5">
          <h2>Recupera tu cuenta GymVerse</h2>
          <p>Hola ${safeName},</p>
          <p>Tu código para cambiar la contraseña es:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px">${safeCode}</p>
          <p>Este código vence en 15 minutos. Si no solicitaste este cambio, ignora este correo.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`No se pudo enviar el correo de recuperación: ${details}`);
  }

  return { delivered: true };
}
