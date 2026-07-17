import { createHash } from "node:crypto";
import { env } from "../config/env.js";

export function isImageStorageConfigured() {
  return Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);
}

function cloudinarySignature(params) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${payload}${env.cloudinaryApiSecret}`).digest("hex");
}

export async function uploadImageAsset({ dataUrl, folder = "gymverse/products", filename = "image" }) {
  if (!isImageStorageConfigured()) {
    const error = new Error("Configura Cloudinary para subir imágenes sin guardarlas en local");
    error.status = 503;
    throw error;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = String(filename || "image")
    .replace(/\.[a-z0-9]+$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";
  const params = { folder, public_id: `${publicId}-${timestamp}`, timestamp };
  const body = new FormData();
  body.set("file", dataUrl);
  body.set("api_key", env.cloudinaryApiKey);
  body.set("folder", params.folder);
  body.set("public_id", params.public_id);
  body.set("timestamp", String(timestamp));
  body.set("signature", cloudinarySignature(params));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/upload`, {
    method: "POST",
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || "No se pudo subir la imagen al almacenamiento externo");
    error.status = response.status >= 500 ? 502 : 400;
    throw error;
  }
  return data.secure_url || data.url;
}
