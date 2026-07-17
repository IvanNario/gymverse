import { env } from "../config/env.js";

const API_BASE = "https://api.mercadopago.com";

function requireAccessToken() {
  if (!env.mercadoPagoAccessToken) {
    const error = new Error("Mercado Pago no está configurado");
    error.status = 503;
    throw error;
  }
}

async function mercadoPagoRequest(path, { method = "GET", body } = {}) {
  requireAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.mercadoPagoAccessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || "Mercado Pago no pudo completar la operación");
    error.status = response.status >= 500 ? 502 : response.status;
    throw error;
  }
  return data;
}

export function isMercadoPagoConfigured() {
  return Boolean(env.mercadoPagoAccessToken);
}

function normalizeOrigin(origin) {
  const fallback = env.clientOrigin;
  const value = String(origin || fallback || "").trim().replace(/\/+$/, "");
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid protocol");
    return url.origin;
  } catch {
    const error = new Error("CLIENT_ORIGIN debe ser una URL válida para retornar desde Mercado Pago");
    error.status = 500;
    throw error;
  }
}

function canUseAutoReturn(origin) {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:" && hostname !== "localhost" && hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

export async function createPaymentPreference({ order, user, clientOrigin }) {
  const items = [
    {
      id: order.orderNumber,
      title: `Pedido GymVerse ${order.orderNumber}`,
      quantity: 1,
      unit_price: Number(order.total),
      currency_id: "MXN",
    },
  ];

  const publicClientOrigin = normalizeOrigin(clientOrigin);
  const returnUrl = `${publicClientOrigin}/?view=orders&order=${order._id}`;
  const body = {
    items,
    payer: {
      name: user.name,
      email: user.email,
    },
    external_reference: order._id.toString(),
    statement_descriptor: "GYMVERSE",
    back_urls: {
      success: returnUrl,
      failure: returnUrl,
      pending: returnUrl,
    },
    metadata: {
      order_id: order._id.toString(),
      order_number: order.orderNumber,
    },
  };

  if (canUseAutoReturn(publicClientOrigin)) body.auto_return = "approved";
  if (env.mercadoPagoWebhookUrl) body.notification_url = env.mercadoPagoWebhookUrl;

  return mercadoPagoRequest("/checkout/preferences", { method: "POST", body });
}

export function paymentPreferenceUrl(preference) {
  if (env.nodeEnv !== "production") return preference.sandbox_init_point || preference.init_point || "";
  return preference.init_point || preference.sandbox_init_point || "";
}

export async function getPayment(paymentId) {
  return mercadoPagoRequest(`/v1/payments/${encodeURIComponent(paymentId)}`);
}

export function paymentStatusFromMercadoPago(status) {
  if (status === "approved") return "paid";
  if (status === "refunded" || status === "charged_back") return "refunded";
  return "pending";
}
