import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { hasAdminPermission } from "../utils/adminPermissions.js";

export async function requireAuth(request, response, next) {
  try {
    const header = request.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return response.status(401).json({ message: "Sesion requerida" });

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) return response.status(401).json({ message: "Usuario no encontrado" });
    if (user.status === "disabled") return response.status(403).json({ message: "Cuenta desactivada" });

    request.user = user;
    next();
  } catch {
    response.status(401).json({ message: "Sesion invalida" });
  }
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ message: "Permisos insuficientes" });
    }
    next();
  };
}

export function requireAdminAccess(request, response, next) {
  if (!request.user || !["admin", "staff"].includes(request.user.role)) {
    return response.status(403).json({ message: "Permisos insuficientes" });
  }
  next();
}

export function requireAdminPermission(permission) {
  return (request, response, next) => {
    if (!hasAdminPermission(request.user, permission)) {
      return response.status(403).json({ message: "No tienes acceso a este módulo" });
    }
    next();
  };
}
