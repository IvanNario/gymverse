import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { ordersRouter } from "./routes/orders.js";
import { adminRouter } from "./routes/admin.js";
import { rewardsRouter } from "./routes/rewards.js";
import { notificationsRouter } from "./routes/notifications.js";
import { supportRouter } from "./routes/support.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { rejectUnsafePayload } from "./middleware/sanitize.js";
import { redactForLog } from "./utils/privacy.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "8mb" }));
app.use(
  cors({
    origin: [env.clientOrigin, env.adminOrigin],
    credentials: true,
  })
);
morgan.token("safe-url", (request) => request.originalUrl.split("?")[0]);
app.use(morgan(env.nodeEnv === "production" ? ":remote-addr :method :safe-url :status :res[content-length] - :response-time ms" : ":method :safe-url :status :response-time ms"));
app.use("/api", (request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Pragma", "no-cache");
  next();
});
app.use(rejectUnsafePayload);

app.get("/health", (_request, response) => {
  const dbReady = mongoose.connection.readyState === 1;
  response.status(dbReady ? 200 : 503).json({
    status: dbReady ? "ok" : "degraded",
    service: "gymverse-api",
    database: dbReady ? "connected" : "disconnected",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

const authLimiter = rateLimit({
  name: "auth",
  windowMs: env.authRateLimitWindowMs,
  max: env.authRateLimitMax,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", authRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/rewards", rewardsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/support", supportRouter);

app.use((_request, response) => {
  response.status(404).json({ message: "Ruta no encontrada" });
});

app.use((error, request, response, _next) => {
  console.error("API error", {
    message: error.message,
    name: error.name,
    path: request.originalUrl.split("?")[0],
    body: redactForLog(request.body),
  });
  let status = error.status || 500;
  if (error.name === "CastError" || error.name === "ValidationError") status = 400;
  if (error.code === 11000) status = 409;
  const message = status >= 500 && env.nodeEnv === "production" ? "Error interno" : error.message || "Error interno";
  response.status(status).json({ message });
});
