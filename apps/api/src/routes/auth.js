import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { signToken } from "../utils/tokens.js";
import { requireAuth } from "../middleware/auth.js";
import { cleanString, isEmail, isStrongEnoughPassword, isValidOptionalPhone, normalizeEmail } from "../utils/validation.js";
import { publicUserProfile } from "../utils/privacy.js";
import { writeAuditLog } from "../utils/auditLog.js";
import { verifyGoogleIdToken } from "../utils/googleAuth.js";
import { env } from "../config/env.js";

export const authRouter = Router();

function publicUser(user) {
  return publicUserProfile(user, { includePrivate: true });
}

function cleanAddresses(addresses = []) {
  return addresses
    .filter((address) => address?.label && address?.street)
    .map((address) => ({
      label: String(address.label || "").trim(),
      street: String(address.street || "").trim(),
      city: String(address.city || "").trim(),
      state: String(address.state || "").trim(),
      zip: String(address.zip || "").trim(),
      phone: String(address.phone || "").trim(),
    }));
}

function validateAddress(address = {}) {
  const required = ["label", "street", "city", "state", "zip", "phone"];
  if (required.some((key) => !cleanString(address[key], 180))) return "Completa todos los datos del domicilio";
  if (!isValidOptionalPhone(address.phone)) return "Teléfono de domicilio inválido";
  if (String(address.zip || "").replace(/\D/g, "").length < 4) return "Código postal inválido";
  return "";
}

authRouter.post("/register", async (request, response) => {
  const name = cleanString(request.body.name, 120);
  const email = normalizeEmail(request.body.email);
  const phone = cleanString(request.body.phone, 30);
  const password = String(request.body.password || "");
  if (!name || !email || !password) {
    return response.status(400).json({ message: "Nombre, correo y contraseña son requeridos" });
  }
  if (!isEmail(email)) return response.status(400).json({ message: "Correo inválido" });
  if (!isValidOptionalPhone(phone)) return response.status(400).json({ message: "Teléfono inválido" });
  if (!isStrongEnoughPassword(password)) return response.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres, letras y números" });

  const exists = await User.exists({ email });
  if (exists) return response.status(409).json({ message: "El correo ya esta registrado" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    phone,
    passwordHash,
    addresses: [],
  });

  response.status(201).json({ token: signToken(user), user: publicUser(user) });
});

authRouter.post("/login", async (request, response) => {
  const email = normalizeEmail(request.body.email);
  const password = String(request.body.password || "");
  if (!isEmail(email) || !password) return response.status(401).json({ message: "Credenciales inválidas" });

  const user = await User.findOne({ email });
  if (!user) return response.status(401).json({ message: "Credenciales inválidas" });
  if (user.status === "disabled") return response.status(403).json({ message: "Cuenta desactivada" });

  const valid = await bcrypt.compare(password || "", user.passwordHash);
  if (!valid) return response.status(401).json({ message: "Credenciales inválidas" });

  if (["admin", "staff", "gym"].includes(user.role)) {
    request.user = user;
    await writeAuditLog(request, { action: "auth.login", resource: "user", resourceId: user._id, metadata: { role: user.role } });
  }

  response.json({ token: signToken(user), user: publicUser(user) });
});

authRouter.get("/google-config", (_request, response) => {
  response.json({
    enabled: Boolean(env.googleClientId),
    clientId: env.googleClientId,
  });
});

authRouter.post("/google", async (request, response, next) => {
  try {
    const googleProfile = await verifyGoogleIdToken(request.body.credential || request.body.idToken);
    const email = normalizeEmail(googleProfile.email);
    if (!isEmail(email)) return response.status(400).json({ message: "Correo de Google inválido" });

    let user = await User.findOne({ googleSubject: googleProfile.subject });
    if (!user) {
      user = await User.findOne({ email });
      if (user && user.role !== "customer") {
        return response.status(403).json({ message: "Usa el acceso de administrador para esta cuenta" });
      }
      if (user) {
        user.googleSubject = googleProfile.subject;
        user.authProvider = user.authProvider === "password" ? "mixed" : "google";
        if (!user.name || user.name === user.email) user.name = cleanString(googleProfile.name, 120) || "Cliente GymVerse";
        await user.save();
      } else {
        const randomPassword = crypto.randomBytes(48).toString("base64url");
        user = await User.create({
          name: cleanString(googleProfile.name, 120) || "Cliente GymVerse",
          email,
          passwordHash: await bcrypt.hash(randomPassword, 10),
          authProvider: "google",
          googleSubject: googleProfile.subject,
          role: "customer",
          points: 0,
          addresses: [],
        });
      }
    }

    if (user.status === "disabled") return response.status(403).json({ message: "Cuenta desactivada" });
    if (user.role !== "customer") return response.status(403).json({ message: "Usa el acceso de administrador para esta cuenta" });

    response.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, (request, response) => {
  response.json({ user: publicUser(request.user) });
});

authRouter.patch("/me", requireAuth, async (request, response) => {
  const { name, phone, addresses } = request.body;

  if (Object.prototype.hasOwnProperty.call(request.body, "name")) {
    const cleanName = cleanString(name, 120);
    if (cleanName.length < 3) return response.status(400).json({ message: "Escribe tu nombre completo" });
    request.user.name = cleanName;
  }
  if (Object.prototype.hasOwnProperty.call(request.body, "phone")) {
    if (!isValidOptionalPhone(phone)) return response.status(400).json({ message: "Teléfono inválido" });
    request.user.phone = cleanString(phone, 30);
  }
  if (Array.isArray(addresses)) {
    const filledAddresses = addresses.filter((address) => Object.values(address || {}).some((value) => cleanString(value, 180)));
    for (const address of filledAddresses) {
      const validation = validateAddress(address);
      if (validation) return response.status(400).json({ message: validation });
    }
    request.user.addresses = cleanAddresses(filledAddresses);
  }

  await request.user.save();
  response.json({ user: publicUser(request.user) });
});

authRouter.patch("/me/password", requireAuth, async (request, response) => {
  const currentPassword = String(request.body.currentPassword || "");
  const newPassword = String(request.body.newPassword || "");
  if (!currentPassword || !newPassword) {
    return response.status(400).json({ message: "Contraseña actual y nueva contraseña son requeridas" });
  }
  if (!isStrongEnoughPassword(newPassword)) {
    return response.status(400).json({ message: "La nueva contraseña debe tener al menos 8 caracteres, letras y números" });
  }
  if (currentPassword === newPassword) {
    return response.status(400).json({ message: "La nueva contraseña debe ser diferente a la actual" });
  }

  const user = await User.findById(request.user._id);
  if (!user) return response.status(404).json({ message: "Usuario no encontrado" });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return response.status(401).json({ message: "La contraseña actual no es correcta" });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  response.json({ ok: true });
});

authRouter.post("/me/favorites/:productId", requireAuth, async (request, response) => {
  const product = await Product.findOne({ _id: request.params.productId, status: "active" }).select("_id");
  if (!product) return response.status(404).json({ message: "Producto no encontrado" });

  const current = (request.user.favorites || []).map((favorite) => favorite.toString());
  if (!current.includes(product._id.toString())) {
    request.user.favorites = [...(request.user.favorites || []), product._id];
    await request.user.save();
  }

  response.json({ user: publicUser(request.user) });
});

authRouter.delete("/me/favorites/:productId", requireAuth, async (request, response) => {
  request.user.favorites = (request.user.favorites || []).filter((favorite) => favorite.toString() !== request.params.productId);
  await request.user.save();
  response.json({ user: publicUser(request.user) });
});
