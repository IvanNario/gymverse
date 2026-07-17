import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(configDir, "../../../../.env");
const localEnv = resolve(process.cwd(), ".env");

dotenv.config({ path: process.env.ENV_FILE || (existsSync(rootEnv) ? rootEnv : localEnv) });

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gymverse",
  mongoDbName: process.env.MONGODB_DB || "gymverse",
  jwtSecret: process.env.JWT_SECRET || "gymverse-dev-secret",
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || "gymverse-dev-data-key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5175",
  adminOrigin: process.env.ADMIN_ORIGIN || "http://localhost:5174",
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 900000),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 12),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
  mercadoPagoWebhookUrl: process.env.MERCADO_PAGO_WEBHOOK_URL || "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
};

if (env.nodeEnv === "production" && env.jwtSecret === "gymverse-dev-secret") {
  throw new Error("JWT_SECRET debe configurarse en producción");
}

if (env.nodeEnv === "production" && (!process.env.DATA_ENCRYPTION_KEY || process.env.DATA_ENCRYPTION_KEY.length < 32)) {
  throw new Error("DATA_ENCRYPTION_KEY debe configurarse con al menos 32 caracteres en producción");
}
