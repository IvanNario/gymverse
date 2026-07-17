import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const checks = [];

function addCheck(name, ok, detail) {
  checks.push({ name, ok, detail });
}

const envExamplePath = resolve(root, ".env.example");
addCheck(".env.example existe", existsSync(envExamplePath), "Crea una plantilla de variables para despliegue.");

if (existsSync(envExamplePath)) {
  const envExample = readFileSync(envExamplePath, "utf8");
  for (const key of [
    "PORT",
    "MONGODB_URI",
    "MONGODB_DB",
    "JWT_SECRET",
    "JWT_EXPIRES_IN",
    "DATA_ENCRYPTION_KEY",
    "CLIENT_ORIGIN",
    "ADMIN_ORIGIN",
    "GOOGLE_CLIENT_ID",
    "VITE_GOOGLE_CLIENT_ID",
    "MERCADO_PAGO_ACCESS_TOKEN",
    "MERCADO_PAGO_WEBHOOK_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ]) {
    addCheck(`.env.example incluye ${key}`, envExample.includes(`${key}=`), `Falta ${key}`);
  }
}

const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");
addCheck(".env ignorado", gitignore.split(/\r?\n/).includes(".env"), "No subas secretos al repositorio.");

const userModel = readFileSync(resolve(root, "apps/api/src/models/User.js"), "utf8");
const orderRoutes = readFileSync(resolve(root, "apps/api/src/routes/orders.js"), "utf8");
const serverFile = readFileSync(resolve(root, "apps/api/src/server.js"), "utf8");
const encryptionFile = readFileSync(resolve(root, "apps/api/src/utils/encryption.js"), "utf8");
const adminRoutes = readFileSync(resolve(root, "apps/api/src/routes/admin.js"), "utf8");
addCheck("Sin tarjetas guardadas en usuarios", !userModel.includes("paymentMethods"), "El modelo User no debe almacenar tarjetas.");
addCheck("Pedidos no aceptan método card", !orderRoutes.includes('"card", "pickup"') && !orderRoutes.includes("paymentMethodId"), "El checkout debe usar Mercado Pago o pago al recoger.");
addCheck("API usa sanitizador de payload", serverFile.includes("rejectUnsafePayload"), "Activa protección contra claves peligrosas en JSON.");
addCheck("API no cachea datos sensibles", serverFile.includes("Cache-Control") && serverFile.includes("no-store"), "Las respuestas /api deben usar no-store.");
addCheck("Cifrado de campos sensibles disponible", encryptionFile.includes("aes-256-gcm"), "Usa cifrado autenticado para datos personales.");
addCheck("Imagenes no se guardan en local", !serverFile.includes('"/uploads"') && !adminRoutes.includes("writeFile("), "Usa almacenamiento externo para imagenes subidas.");

const envFile = resolve(root, ".env");
if (existsSync(envFile)) {
  const envText = readFileSync(envFile, "utf8");
  addCheck("JWT_SECRET configurado", /JWT_SECRET=.{16,}/.test(envText), "Usa un secreto largo antes de producción.");
  addCheck("DATA_ENCRYPTION_KEY configurado", /DATA_ENCRYPTION_KEY=.{32,}/.test(envText), "Usa una clave de cifrado de al menos 32 caracteres.");
  if (/NODE_ENV=production/.test(envText)) {
    addCheck("Cloudinary configurado", /CLOUDINARY_CLOUD_NAME=.+/.test(envText) && /CLOUDINARY_API_KEY=.+/.test(envText) && /CLOUDINARY_API_SECRET=.+/.test(envText), "Configura Cloudinary para subir imagenes sin filesystem local.");
    addCheck("Google Login configurado", /GOOGLE_CLIENT_ID=.+/.test(envText), "Configura GOOGLE_CLIENT_ID para validar tokens de Google.");
  }
}

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "OK" : "WARN"} - ${check.name}${check.ok ? "" : `: ${check.detail}`}`);
}

if (failed.length) {
  console.log(`Auditoría completada con ${failed.length} advertencia(s).`);
} else {
  console.log("Auditoría completada sin advertencias.");
}
