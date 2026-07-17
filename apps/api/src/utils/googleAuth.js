import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";

const googleClient = new OAuth2Client(env.googleClientId || undefined);

export async function verifyGoogleIdToken(idToken) {
  if (!env.googleClientId) {
    throw Object.assign(new Error("Google Login no está configurado"), { status: 503 });
  }
  const token = String(idToken || "").trim();
  if (!token || token.length > 4096) {
    throw Object.assign(new Error("Token de Google inválido"), { status: 400 });
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email) {
    throw Object.assign(new Error("No se pudo verificar la cuenta de Google"), { status: 401 });
  }
  if (payload.email_verified !== true && payload.email_verified !== "true") {
    throw Object.assign(new Error("El correo de Google no está verificado"), { status: 403 });
  }

  return {
    subject: String(payload.sub),
    email: String(payload.email).toLowerCase(),
    name: String(payload.name || payload.email.split("@")[0]).trim(),
  };
}
